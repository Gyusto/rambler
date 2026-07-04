namespace Rambler.Server.WebService.Controllers
{
    using Database;
    using Database.Models;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Http;
    using Microsoft.AspNetCore.Http.Features;
    using Microsoft.AspNetCore.Identity;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.EntityFrameworkCore;
    using Newtonsoft.Json;
    using Newtonsoft.Json.Linq;
    using Services;
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;
    using System.Net.Http;
    using System.Threading;
    using System.Threading.Channels;
    using System.Threading.Tasks;

    [Route("Blog")]
    public class BlogController : ControllerBase
    {
        private const int MaxBodyLength = 2000;
        private const int DefaultPageSize = 10;
        private const int MinPageSize = 1;
        private const int MaxPageSize = 50;
        private const int ModeratorLevel = (int)ApplicationUser.UserLevel.Admin;
        private static readonly TimeSpan RateLimit = TimeSpan.FromSeconds(5);

        /// <summary>Last successful post time per user, for rate limiting.</summary>
        private static readonly ConcurrentDictionary<Guid, DateTime> LastPostByUser =
            new ConcurrentDictionary<Guid, DateTime>();

        /// <summary>How often the SSE stream sends a keep-alive comment when idle.</summary>
        private static readonly TimeSpan StreamKeepAlive = TimeSpan.FromSeconds(20);

        /// <summary>Shared client for the GitHub proxy (one instance avoids socket exhaustion).</summary>
        private static readonly HttpClient GitHub = CreateGitHubClient();

        /// <summary>How long the GitHub issues response is cached in-memory.</summary>
        private static readonly TimeSpan IssuesCacheTtl = TimeSpan.FromSeconds(60);

        private static readonly object IssuesCacheLock = new object();
        private static IssueDto[] issuesCache;
        private static DateTime issuesCachedAt;

        private readonly ApplicationDbContext db;
        private readonly UserManager<ApplicationUser> userManager;
        private readonly Socket.IAuthorize authorizor;
        private readonly BlogPostCatalog catalog;
        private readonly BlogCommentBroadcaster broadcaster;
        private readonly Microsoft.Extensions.Configuration.IConfiguration configuration;

        public BlogController(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            Socket.IAuthorize authorizor,
            BlogPostCatalog catalog,
            BlogCommentBroadcaster broadcaster,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            this.db = db;
            this.userManager = userManager;
            this.authorizor = authorizor;
            this.catalog = catalog;
            this.broadcaster = broadcaster;
            this.configuration = configuration;
        }

        private static HttpClient CreateGitHubClient()
        {
            var client = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(10),
            };
            // GitHub rejects requests without a User-Agent.
            client.DefaultRequestHeaders.Add("User-Agent", "rambler");
            return client;
        }

        /// <summary>
        /// A page of top-level comments (newest first) plus their replies, using keyset
        /// pagination, together with the post's moderation state. Public.
        /// </summary>
        [HttpGet("{slug}/comments")]
        [AllowAnonymous]
        public async Task<IActionResult> GetComments(
            string slug,
            [FromQuery] string token,
            [FromQuery] string cursor,
            [FromQuery] int? limit)
        {
            var identity = await ResolveIdentity(token);

            var pageSize = limit ?? DefaultPageSize;
            if (pageSize < MinPageSize)
            {
                pageSize = MinPageSize;
            }
            else if (pageSize > MaxPageSize)
            {
                pageSize = MaxPageSize;
            }

            // Root comments only, newest first, tie-broken by Id so the keyset is stable.
            var rootsQuery = db.BlogComments
                .Where(c => c.PostSlug == slug && c.ParentId == null);

            if (TryDecodeCursor(cursor, out var cursorTime, out var cursorId))
            {
                rootsQuery = rootsQuery.Where(c =>
                    c.CreatedOn < cursorTime ||
                    (c.CreatedOn == cursorTime && c.Id < cursorId));
            }

            // Take one extra to know whether an older page exists.
            var roots = await rootsQuery
                .OrderByDescending(c => c.CreatedOn)
                .ThenByDescending(c => c.Id)
                .Take(pageSize + 1)
                .ToListAsync();

            var hasMore = roots.Count > pageSize;
            if (hasMore)
            {
                roots.RemoveAt(roots.Count - 1);
            }

            var rootIds = roots.Select(c => c.Id).ToList();

            // Replies for this page's roots, oldest first so the client can thread them.
            var replies = await db.BlogComments
                .Where(c => c.PostSlug == slug && c.ParentId != null && rootIds.Contains(c.ParentId.Value))
                .OrderBy(c => c.CreatedOn)
                .ThenBy(c => c.Id)
                .ToListAsync();

            var totalCount = await db.BlogComments
                .CountAsync(c => c.PostSlug == slug);

            // Roots stay newest-first; each root is followed by its replies (oldest first).
            var repliesByParent = replies
                .GroupBy(r => r.ParentId.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var ordered = new List<BlogComment>();
            foreach (var root in roots)
            {
                ordered.Add(root);
                if (repliesByParent.TryGetValue(root.Id, out var rootReplies))
                {
                    ordered.AddRange(rootReplies);
                }
            }

            var lastRoot = roots.Count > 0 ? roots[roots.Count - 1] : null;
            var nextCursor = hasMore && lastRoot != null ? EncodeCursor(lastRoot) : null;

            var state = await db.BlogPostStates
                .FirstOrDefaultAsync(s => s.Slug == slug);

            return Ok(new CommentsResponse
            {
                CommentsDisabled = state?.CommentsDisabled ?? false,
                Hidden = state?.Hidden ?? false,
                CanModerate = identity.IsModerator,
                TotalCount = totalCount,
                NextCursor = nextCursor,
                Comments = ordered.Select(c => ToDto(c, identity)).ToArray(),
            });
        }

        /// <summary>
        /// Server-Sent Events stream of live comment changes for a post. Public.
        /// Emits one <c>data:</c> event per created/edited/deleted comment and a
        /// <c>:ka</c> keep-alive comment when idle. The DTO is viewer-agnostic
        /// (CanEdit/CanDelete are always false); the client personalizes rights.
        /// </summary>
        [HttpGet("{slug}/comments/stream")]
        [AllowAnonymous]
        public async Task StreamComments(string slug)
        {
            Response.ContentType = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["Connection"] = "keep-alive";
            // Tell reverse proxies (nginx) not to buffer the stream.
            Response.Headers["X-Accel-Buffering"] = "no";
            HttpContext.Features.Get<IHttpBufferingFeature>()?.DisableResponseBuffering();

            var cancellation = HttpContext.RequestAborted;
            var (id, reader) = broadcaster.Subscribe(slug);
            try
            {
                // Flush the headers immediately so the client's connection opens.
                await Response.Body.FlushAsync(cancellation);

                while (!cancellation.IsCancellationRequested)
                {
                    string json = null;
                    var received = false;

                    // Wake up at least every keep-alive interval, or sooner on an event.
                    using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation))
                    {
                        timeout.CancelAfter(StreamKeepAlive);
                        try
                        {
                            json = await reader.ReadAsync(timeout.Token);
                            received = true;
                        }
                        catch (OperationCanceledException)
                        {
                            // Either the keep-alive fired or the client went away.
                        }
                        catch (ChannelClosedException)
                        {
                            break;
                        }
                    }

                    if (cancellation.IsCancellationRequested)
                    {
                        break;
                    }

                    if (received && json != null)
                    {
                        await Response.WriteAsync("data: " + json + "\n\n", cancellation);
                    }
                    else
                    {
                        await Response.WriteAsync(":ka\n\n", cancellation);
                    }

                    await Response.Body.FlushAsync(cancellation);
                }
            }
            catch (OperationCanceledException)
            {
                // Client disconnected mid-write; nothing to do.
            }
            finally
            {
                broadcaster.Unsubscribe(slug, id);
            }
        }

        /// <summary>Leave a comment (or reply) on a blog post. Registered users or valid guests.</summary>
        [HttpPost("{slug}/comments")]
        [AllowAnonymous]
        public async Task<IActionResult> PostComment(string slug, [FromQuery] string token, [FromBody] CommentRequest request)
        {
            if (!catalog.IsKnown(slug))
            {
                return NotFound();
            }

            var identity = await ResolveIdentity(token);
            if (identity.UserId == null)
            {
                return Unauthorized();
            }

            var state = await db.BlogPostStates
                .FirstOrDefaultAsync(s => s.Slug == slug);
            if (state != null && state.CommentsDisabled && !identity.IsModerator)
            {
                return StatusCode(403, "Comments are closed for this post.");
            }

            if (request == null || string.IsNullOrWhiteSpace(request.Body))
            {
                return BadRequest("Comment body is required.");
            }

            var userId = identity.UserId.Value;
            if (LastPostByUser.TryGetValue(userId, out var last) && DateTime.UtcNow - last < RateLimit)
            {
                return StatusCode(429, "You're commenting too fast.");
            }

            if (request.ParentId != null)
            {
                var parentOk = await db.BlogComments.AnyAsync(c =>
                    c.Id == request.ParentId.Value &&
                    c.PostSlug == slug &&
                    c.ParentId == null);
                if (!parentOk)
                {
                    return BadRequest("Invalid reply target.");
                }
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
                UserId = userId,
                Nick = identity.Nick,
                Body = body,
                CreatedOn = DateTime.UtcNow,
                IsGuest = identity.IsGuest,
            };

            db.BlogComments.Add(comment);
            await db.SaveChangesAsync();

            LastPostByUser[userId] = DateTime.UtcNow;

            // Push to live viewers with a viewer-agnostic DTO (the client personalizes rights).
            PublishComment(comment.PostSlug, "created", ToStreamDto(comment), null);

            var dto = ToDto(comment, identity);
            dto.CanDelete = true;
            return Ok(dto);
        }

        /// <summary>Edit a comment's body. Only its author may edit (moderators can delete, not rewrite).</summary>
        [HttpPut("comments/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> EditComment(long id, [FromQuery] string token, [FromBody] EditRequest request)
        {
            var identity = await ResolveIdentity(token);
            if (identity.UserId == null)
            {
                return Unauthorized();
            }

            var comment = await db.BlogComments.FirstOrDefaultAsync(c => c.Id == id);
            if (comment == null)
            {
                return NotFound();
            }

            if (comment.UserId != identity.UserId.Value)
            {
                return StatusCode(403, "You can't edit that comment.");
            }

            if (request == null || string.IsNullOrWhiteSpace(request.Body))
            {
                return BadRequest("Comment body is required.");
            }

            var body = request.Body.Trim();
            if (body.Length > MaxBodyLength)
            {
                body = body.Substring(0, MaxBodyLength);
            }

            comment.Body = body;
            comment.EditedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();

            PublishComment(comment.PostSlug, "edited", ToStreamDto(comment), null);

            return Ok(ToDto(comment, identity));
        }

        /// <summary>Delete a comment (its author or a moderator). Cascades to replies.</summary>
        [HttpDelete("comments/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteComment(long id, [FromQuery] string token)
        {
            var identity = await ResolveIdentity(token);
            if (identity.UserId == null)
            {
                return Unauthorized();
            }

            var comment = await db.BlogComments.FirstOrDefaultAsync(c => c.Id == id);
            if (comment == null)
            {
                return NotFound();
            }

            if (comment.UserId != identity.UserId.Value && !identity.IsModerator)
            {
                return StatusCode(403, "You can't delete that comment.");
            }

            var slug = comment.PostSlug;

            db.BlogComments.Remove(comment);

            if (comment.ParentId == null)
            {
                var replies = await db.BlogComments
                    .Where(c => c.ParentId == id)
                    .ToListAsync();
                db.BlogComments.RemoveRange(replies);
            }

            await db.SaveChangesAsync();

            // Publish the removed root id; live clients drop its replies themselves.
            PublishComment(slug, "deleted", null, id);

            return NoContent();
        }

        /// <summary>Toggle per-post moderation flags. Moderators only.</summary>
        [HttpPost("{slug}/moderation")]
        [AllowAnonymous]
        public async Task<IActionResult> SetModeration(string slug, [FromQuery] string token, [FromBody] ModerationRequest request)
        {
            if (!catalog.IsKnown(slug))
            {
                return NotFound();
            }

            var identity = await ResolveIdentity(token);
            if (!identity.IsModerator)
            {
                return StatusCode(403, "Moderators only.");
            }

            var state = await db.BlogPostStates
                .FirstOrDefaultAsync(s => s.Slug == slug);
            if (state == null)
            {
                state = new BlogPostState { Slug = slug };
                db.BlogPostStates.Add(state);
            }

            if (request?.CommentsDisabled != null)
            {
                state.CommentsDisabled = request.CommentsDisabled.Value;
            }

            if (request?.Hidden != null)
            {
                state.Hidden = request.Hidden.Value;
            }

            await db.SaveChangesAsync();

            return Ok(new PostStateSummary
            {
                Slug = state.Slug,
                CommentsDisabled = state.CommentsDisabled,
                Hidden = state.Hidden,
            });
        }

        /// <summary>Moderation overview of every known post (has state or comments).</summary>
        [HttpGet("posts/state")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPostsState([FromQuery] string token)
        {
            var identity = await ResolveIdentity(token);

            var states = await db.BlogPostStates.ToListAsync();

            var counts = await db.BlogComments
                .GroupBy(c => c.PostSlug)
                .Select(g => new { Slug = g.Key, Count = g.Count() })
                .ToListAsync();

            var countBySlug = counts.ToDictionary(c => c.Slug, c => c.Count);
            var slugs = new HashSet<string>(states.Select(s => s.Slug));
            slugs.UnionWith(countBySlug.Keys);

            var stateBySlug = states.ToDictionary(s => s.Slug);

            var posts = slugs.Select(slug =>
            {
                stateBySlug.TryGetValue(slug, out var state);
                countBySlug.TryGetValue(slug, out var count);
                return new PostStateDto
                {
                    Slug = slug,
                    CommentsDisabled = state?.CommentsDisabled ?? false,
                    Hidden = state?.Hidden ?? false,
                    CommentCount = count,
                };
            }).ToArray();

            return Ok(new PostsStateResponse
            {
                CanModerate = identity.IsModerator,
                Posts = posts,
            });
        }

        /// <summary>
        /// Server-side proxy for the project's GitHub issues (used by the changelog page),
        /// so the token stays server-side and rate limits are higher. Pull requests are
        /// filtered out and the mapped result is cached in-memory for ~60s. Public.
        /// </summary>
        [HttpGet("issues")]
        [AllowAnonymous]
        public async Task<IActionResult> GetIssues()
        {
            lock (IssuesCacheLock)
            {
                if (issuesCache != null && DateTime.UtcNow - issuesCachedAt < IssuesCacheTtl)
                {
                    return Ok(issuesCache);
                }
            }

            var repo = configuration["Blog:GitHubRepo"];
            if (string.IsNullOrWhiteSpace(repo))
            {
                repo = "8labs/rambler";
            }

            var token = configuration["Blog:GitHubToken"];
            var url = "https://api.github.com/repos/" + repo +
                "/issues?state=all&per_page=100&sort=updated";

            try
            {
                using (var httpRequest = new HttpRequestMessage(HttpMethod.Get, url))
                {
                    if (!string.IsNullOrWhiteSpace(token))
                    {
                        httpRequest.Headers.Add("Authorization", "Bearer " + token);
                    }

                    using (var response = await GitHub.SendAsync(httpRequest))
                    {
                        if (!response.IsSuccessStatusCode)
                        {
                            return StatusCode(502, "GitHub request failed.");
                        }

                        var raw = await response.Content.ReadAsStringAsync();
                        var issues = MapIssues(JArray.Parse(raw));

                        lock (IssuesCacheLock)
                        {
                            issuesCache = issues;
                            issuesCachedAt = DateTime.UtcNow;
                        }

                        return Ok(issues);
                    }
                }
            }
            catch (HttpRequestException)
            {
                return StatusCode(502, "GitHub request failed.");
            }
            catch (TaskCanceledException)
            {
                return StatusCode(502, "GitHub request timed out.");
            }
            catch (JsonException)
            {
                return StatusCode(502, "GitHub response was not understood.");
            }
        }

        /// <summary>Map GitHub's issue JSON to the trimmed client shape, dropping pull requests.</summary>
        private static IssueDto[] MapIssues(JArray items)
        {
            var mapped = new List<IssueDto>();
            foreach (var item in items)
            {
                if (!(item is JObject issue))
                {
                    continue;
                }

                // Issues and PRs share the endpoint; PRs carry a "pull_request" object.
                if (issue["pull_request"] != null)
                {
                    continue;
                }

                var labels = new List<LabelDto>();
                if (issue["labels"] is JArray labelArray)
                {
                    foreach (var label in labelArray.OfType<JObject>())
                    {
                        labels.Add(new LabelDto
                        {
                            Name = (string)label["name"],
                            Color = (string)label["color"],
                        });
                    }
                }

                mapped.Add(new IssueDto
                {
                    Number = (long?)issue["number"] ?? 0,
                    Title = (string)issue["title"],
                    State = (string)issue["state"],
                    Url = (string)issue["html_url"],
                    Comments = (int?)issue["comments"] ?? 0,
                    CreatedAt = (string)issue["created_at"],
                    Author = (string)(issue["user"]?["login"]),
                    Labels = labels.ToArray(),
                });
            }

            return mapped.ToArray();
        }

        /// <summary>Serialize and fan out a comment event to the post's live subscribers.</summary>
        private void PublishComment(string slug, string action, CommentDto comment, long? id)
        {
            var payload = new CommentEvent
            {
                Action = action,
                Comment = comment,
                Id = id,
            };

            // Same serializer/casing (PascalCase) as the rest of the API.
            broadcaster.Publish(slug, JsonConvert.SerializeObject(payload));
        }

        /// <summary>A viewer-agnostic DTO for the shared stream (no per-caller edit/delete rights).</summary>
        private static CommentDto ToStreamDto(BlogComment c)
        {
            var dto = ToDto(c, new Identity());
            dto.CanEdit = false;
            dto.CanDelete = false;
            return dto;
        }

        /// <summary>Map a stored comment to its client shape, honoring the caller's rights.</summary>
        private static CommentDto ToDto(BlogComment c, Identity identity)
        {
            return new CommentDto
            {
                Id = c.Id,
                ParentId = c.ParentId,
                Nick = c.Nick,
                Body = c.Body,
                CreatedOn = DateTime.SpecifyKind(c.CreatedOn, DateTimeKind.Utc).ToString("o"),
                EditedOn = c.EditedOn != null
                    ? DateTime.SpecifyKind(c.EditedOn.Value, DateTimeKind.Utc).ToString("o")
                    : null,
                IsGuest = c.IsGuest,
                CanEdit = identity.UserId != null && identity.UserId == c.UserId,
                CanDelete = (identity.UserId != null && identity.UserId == c.UserId) || identity.IsModerator,
            };
        }

        /// <summary>Encode the keyset position of a root comment into an opaque cursor.</summary>
        private static string EncodeCursor(BlogComment comment)
        {
            var raw = comment.CreatedOn.Ticks + "_" + comment.Id;
            return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(raw));
        }

        /// <summary>
        /// Decode an opaque cursor back into its (CreatedOn, Id) keyset position.
        /// Returns false (treat as first page) for a null, empty, or malformed cursor.
        /// </summary>
        private static bool TryDecodeCursor(string cursor, out DateTime createdOn, out long id)
        {
            createdOn = default;
            id = default;

            if (string.IsNullOrWhiteSpace(cursor))
            {
                return false;
            }

            try
            {
                var raw = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
                var parts = raw.Split('_');
                if (parts.Length != 2 ||
                    !long.TryParse(parts[0], out var ticks) ||
                    !long.TryParse(parts[1], out id))
                {
                    return false;
                }

                createdOn = new DateTime(ticks, DateTimeKind.Unspecified);
                return true;
            }
            catch (FormatException)
            {
                return false;
            }
            catch (ArgumentException)
            {
                return false;
            }
        }

        /// <summary>
        /// Resolve the caller from a login cookie or a chat token (so guests work),
        /// falling back to an anonymous identity when neither is present.
        /// </summary>
        private async Task<Identity> ResolveIdentity(string token)
        {
            if (User.Identity.IsAuthenticated)
            {
                var user = await userManager.GetUserAsync(User);
                if (user != null)
                {
                    return new Identity
                    {
                        UserId = user.Id,
                        Nick = user.UserName,
                        IsGuest = false,
                        Level = (int)user.Level,
                    };
                }
            }

            if (!string.IsNullOrWhiteSpace(token))
            {
                var identity = authorizor.Authorize(token, true);
                if (identity != null)
                {
                    return new Identity
                    {
                        UserId = identity.UserId,
                        Nick = identity.Nick,
                        IsGuest = identity.IsGuest,
                        Level = identity.Level,
                    };
                }
            }

            return new Identity();
        }

        /// <summary>The resolved caller: null UserId means anonymous.</summary>
        private class Identity
        {
            public Guid? UserId { get; set; }

            public string Nick { get; set; }

            public bool IsGuest { get; set; }

            public int Level { get; set; }

            /// <summary>A non-guest with admin level can moderate every post.</summary>
            public bool IsModerator => UserId != null && !IsGuest && Level >= ModeratorLevel;
        }

        /// <summary>Incoming payload for a new comment.</summary>
        public class CommentRequest
        {
            public string Body { get; set; }

            public long? ParentId { get; set; }
        }

        /// <summary>Incoming payload for editing a comment.</summary>
        public class EditRequest
        {
            public string Body { get; set; }
        }

        /// <summary>Incoming payload for a moderation change.</summary>
        public class ModerationRequest
        {
            public bool? CommentsDisabled { get; set; }

            public bool? Hidden { get; set; }
        }

        /// <summary>The comment shape returned to the client.</summary>
        public class CommentDto
        {
            public long Id { get; set; }

            public long? ParentId { get; set; }

            public string Nick { get; set; }

            public string Body { get; set; }

            /// <summary>ISO-8601 UTC timestamp (with a trailing Z-style offset).</summary>
            public string CreatedOn { get; set; }

            /// <summary>ISO-8601 UTC timestamp of the last edit, or null if never edited.</summary>
            public string EditedOn { get; set; }

            public bool IsGuest { get; set; }

            /// <summary>True when the caller is the author (only the author may edit the text).</summary>
            public bool CanEdit { get; set; }

            public bool CanDelete { get; set; }
        }

        /// <summary>A page of comments plus per-post state for a single post.</summary>
        public class CommentsResponse
        {
            public bool CommentsDisabled { get; set; }

            public bool Hidden { get; set; }

            public bool CanModerate { get; set; }

            /// <summary>Total comments for the post (roots + replies), across all pages.</summary>
            public int TotalCount { get; set; }

            /// <summary>Opaque cursor for the next (older) page, or null when there is none.</summary>
            public string NextCursor { get; set; }

            public CommentDto[] Comments { get; set; }
        }

        /// <summary>The state returned after a moderation change.</summary>
        public class PostStateSummary
        {
            public string Slug { get; set; }

            public bool CommentsDisabled { get; set; }

            public bool Hidden { get; set; }
        }

        /// <summary>A single post's state in the moderation overview.</summary>
        public class PostStateDto
        {
            public string Slug { get; set; }

            public bool CommentsDisabled { get; set; }

            public bool Hidden { get; set; }

            public int CommentCount { get; set; }
        }

        /// <summary>The moderation overview response.</summary>
        public class PostsStateResponse
        {
            public bool CanModerate { get; set; }

            public PostStateDto[] Posts { get; set; }
        }

        /// <summary>A single live update pushed over the SSE stream.</summary>
        public class CommentEvent
        {
            /// <summary>One of "created", "edited", or "deleted".</summary>
            public string Action { get; set; }

            /// <summary>The affected comment for "created"/"edited"; null for "deleted".</summary>
            public CommentDto Comment { get; set; }

            /// <summary>The removed comment's id for "deleted"; null otherwise.</summary>
            public long? Id { get; set; }
        }

        /// <summary>A trimmed GitHub issue returned by the changelog proxy.</summary>
        public class IssueDto
        {
            public long Number { get; set; }

            public string Title { get; set; }

            public string State { get; set; }

            /// <summary>The issue's <c>html_url</c> on GitHub.</summary>
            public string Url { get; set; }

            public int Comments { get; set; }

            /// <summary>ISO-8601 creation timestamp, passed through as GitHub reports it.</summary>
            public string CreatedAt { get; set; }

            /// <summary>The issue author's login.</summary>
            public string Author { get; set; }

            public LabelDto[] Labels { get; set; }
        }

        /// <summary>A trimmed GitHub issue label.</summary>
        public class LabelDto
        {
            public string Name { get; set; }

            public string Color { get; set; }
        }
    }
}
