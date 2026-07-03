namespace Rambler.Server.Options
{
    /// <summary>MinIO / S3-compatible object storage for uploaded media.</summary>
    public class MediaOptions
    {
        /// <summary>S3 endpoint the server talks to (e.g. http://minio:9000).</summary>
        public string Endpoint { get; set; }

        /// <summary>Base URL the browser uses to fetch objects (e.g. http://localhost:9000/rambler-media).</summary>
        public string PublicUrl { get; set; }

        public string AccessKey { get; set; }

        public string SecretKey { get; set; }

        public string Bucket { get; set; }
    }
}
