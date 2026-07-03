namespace Rambler.Server.WebService.Controllers
{
    using Amazon.S3;
    using Amazon.S3.Model;
    using Amazon.S3.Util;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Http;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Extensions.Options;
    using Options;
    using System;
    using System.IO;
    using System.Threading.Tasks;

    [Authorize]
    public class MediaController : ControllerBase
    {
        private static readonly System.Collections.Generic.HashSet<string> AllowedExtensions =
            new System.Collections.Generic.HashSet<string>(System.StringComparer.OrdinalIgnoreCase)
            {
                // images
                ".png", ".jpg", ".jpeg", ".gif", ".webp",
                // documents
                ".pdf", ".txt", ".md", ".csv", ".json",
                ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip",
            };
        private const long MaxBytes = 15 * 1024 * 1024;
        private static bool bucketReady;

        private readonly MediaOptions opts;
        private readonly Socket.IAuthorize authorizor;

        public MediaController(IOptions<MediaOptions> opts, Socket.IAuthorize authorizor)
        {
            this.opts = opts.Value;
            this.authorizor = authorizor;
        }

        /// <summary>
        /// Upload an image to object storage and return its public URL.
        /// Auth is a login cookie OR a valid chat token (so guests can upload too).
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromQuery] string token)
        {
            if (!User.Identity.IsAuthenticated && authorizor.Authorize(token, true) == null)
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(opts?.Endpoint) || string.IsNullOrWhiteSpace(opts.Bucket))
            {
                return StatusCode(503, "Media storage is not configured.");
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded.");
            }

            if (file.Length > MaxBytes)
            {
                return BadRequest("That file is too large (max 15MB).");
            }

            var name = SafeName(Path.GetFileName(file.FileName));
            var ext = Path.GetExtension(name);
            if (!AllowedExtensions.Contains(ext))
            {
                return BadRequest("That file type isn't allowed.");
            }

            var client = CreateClient();
            await EnsureBucket(client);

            // {guid}/{filename} keeps uploads unique but preserves the original name
            // in the URL so the client can display it (esp. for documents).
            var key = Guid.NewGuid().ToString("N") + "/" + name;

            using (var stream = file.OpenReadStream())
            {
                await client.PutObjectAsync(new PutObjectRequest
                {
                    BucketName = opts.Bucket,
                    Key = key,
                    InputStream = stream,
                    ContentType = string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType,
                    AutoCloseStream = true,
                });
            }

            return Ok(new
            {
                Url = $"{opts.PublicUrl.TrimEnd('/')}/{key}",
                Name = name,
                ContentType = file.ContentType,
            });
        }

        /// <summary>Strip path + unsafe characters from an uploaded filename.</summary>
        private static string SafeName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return "file";
            }

            var cleaned = System.Text.RegularExpressions.Regex.Replace(name, "[^A-Za-z0-9._-]", "_").Trim('_');
            if (string.IsNullOrEmpty(cleaned))
            {
                cleaned = "file";
            }

            return cleaned.Length > 80 ? cleaned.Substring(cleaned.Length - 80) : cleaned;
        }

        private IAmazonS3 CreateClient()
        {
            var config = new AmazonS3Config
            {
                ServiceURL = opts.Endpoint,
                ForcePathStyle = true, // MinIO uses path-style bucket addressing
            };
            return new AmazonS3Client(opts.AccessKey, opts.SecretKey, config);
        }

        private async Task EnsureBucket(IAmazonS3 client)
        {
            if (bucketReady)
            {
                return;
            }

            if (!await AmazonS3Util.DoesS3BucketExistV2Async(client, opts.Bucket))
            {
                await client.PutBucketAsync(new PutBucketRequest { BucketName = opts.Bucket });
            }

            // public read so the browser can load images directly
            var policy =
                "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\"," +
                "\"Principal\":\"*\",\"Action\":[\"s3:GetObject\"]," +
                "\"Resource\":[\"arn:aws:s3:::" + opts.Bucket + "/*\"]}]}";

            await client.PutBucketPolicyAsync(new PutBucketPolicyRequest
            {
                BucketName = opts.Bucket,
                Policy = policy,
            });

            bucketReady = true;
        }
    }
}
