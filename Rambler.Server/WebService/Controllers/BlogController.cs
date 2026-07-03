namespace Rambler.Server.WebService.Controllers
{
    using Database;
    using Database.Models;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Identity;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.EntityFrameworkCore;
    using System;
    using System.Linq;
    using System.Threading.Tasks;

    [Route("Blog")]
    public class BlogController : ControllerBase
    {
        private const int MaxBodyLength = 2000;

        private readonly ApplicationDbContext db;
        private readonly UserManager<ApplicationUser> userManager;

        public BlogController(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
        {
            this.db = db;
            this.userManager = userManager;
        }

        /// <summary>Comments for a blog post, oldest first. Public.</summary>
        [HttpGet("{slug}/comments")]
        [AllowAnonymous]
        public async Task<IActionResult> GetComments(string slug)
        {
            var comments = await db.BlogComments
                .Where(c => c.PostSlug == slug)
                .OrderBy(c => c.CreatedOn)
                .Select(c => new CommentDto
                {
                    Id = c.Id,
                    ParentId = c.ParentId,
                    Nick = c.Nick,
                    Body = c.Body,
                    CreatedOn = c.CreatedOn,
                })
                .ToListAsync();

            return Ok(comments);
        }

        /// <summary>Leave a comment (or reply) on a blog post. Requires a logged-in user.</summary>
        [HttpPost("{slug}/comments")]
        [Authorize]
        public async Task<IActionResult> PostComment(string slug, [FromBody] CommentRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Body))
            {
                return BadRequest("Comment body is required.");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var body = request.Body.Trim();
            if (body.Length > MaxBodyLength)
            {
                body = body.Substring(0, MaxBodyLength);
            }

            var comment = new BlogComment
            {
                PostSlug = slug,
                ParentId = request.ParentId,
                UserId = user.Id,
                Nick = user.UserName,
                Body = body,
                CreatedOn = DateTime.UtcNow,
            };

            db.BlogComments.Add(comment);
            await db.SaveChangesAsync();

            return Ok(new CommentDto
            {
                Id = comment.Id,
                ParentId = comment.ParentId,
                Nick = comment.Nick,
                Body = comment.Body,
                CreatedOn = comment.CreatedOn,
            });
        }

        /// <summary>Incoming payload for a new comment.</summary>
        public class CommentRequest
        {
            public string Body { get; set; }

            public long? ParentId { get; set; }
        }

        /// <summary>The comment shape returned to the client.</summary>
        public class CommentDto
        {
            public long Id { get; set; }

            public long? ParentId { get; set; }

            public string Nick { get; set; }

            public string Body { get; set; }

            public DateTime CreatedOn { get; set; }
        }
    }
}
