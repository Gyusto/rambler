namespace Rambler.Server.WebService.Controllers
{
    using Database;
    using Database.Models;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Identity;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.EntityFrameworkCore;
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;

    [Route("Blog")]
    public class BlogController : ControllerBase
    {
        private const int MaxBodyLength = 2000;
        private const int MaxComments = 500;
        private const int ModeratorLevel = (int)ApplicationUser.UserLevel.Admin;
        private static readonly TimeSpan RateLimit = TimeSpan.FromSeconds(5);

        /// <summary>Last successful post time per user, for rate limiting.</summary>
        private static readonly ConcurrentDictionary<Guid, DateTime> LastPostByUser =
            new ConcurrentDictionary<Guid, DateTime>();

        private readonly ApplicationDbContext db;
        private readonly UserManager<ApplicationUser> userManager;
        private readonly Socket.IAuthorize authorizor;

        public BlogController(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            Socket.IAuthorize authorizor)
        {
            this.db = db;
            this.userManager = userManager;
            this.authorizor = authorizor;
        }

        /// <summary>Comments + moderation state for a blog post, oldest first. Public.</summary>
        [HttpGet("{slug}/comments")]
        [AllowAnonymous]
        public async Task<IActionResult> GetComments(string slug, [FromQuery] string token)
        {
            var identity = await ResolveIdentity(token);

            // Newest 500 by CreatedOn, but returned in ascending order.
            var comments = await db.BlogComments
                .Where(c => c.PostSlug == slug)
                .OrderByDescending(c => c.CreatedOn)
                .Take(MaxComments)
                .ToListAsync();

            comments.Reverse();

            var state = await db.BlogPostStates
                .FirstOrDefaultAsync(s => s.Slug == slug);

            return Ok(new CommentsResponse
            {
                CommentsDisabled = state?.CommentsDisabled ?? false,
                Hidden = state?.Hidden ?? false,
                CanModerate = identity.IsModerator,
                Comments = comments.Select(c => ToDto(c, identity)).ToArray(),
            });
        }

        /// <summary>Leave a comment (or reply) on a blog post. Registered users or valid guests.</summary>
        [HttpPost("{slug}/comments")]
        [AllowAnonymous]
        public async Task<IActionResult> PostComment(string slug, [FromQuery] string token, [FromBody] CommentRequest request)
        {
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

            var dto = ToDto(comment, identity);
            dto.CanDelete = true;
            return Ok(dto);
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

            db.BlogComments.Remove(comment);

            if (comment.ParentId == null)
            {
                var replies = await db.BlogComments
                    .Where(c => c.ParentId == id)
                    .ToListAsync();
                db.BlogComments.RemoveRange(replies);
            }

            await db.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>Toggle per-post moderation flags. Moderators only.</summary>
        [HttpPost("{slug}/moderation")]
        [AllowAnonymous]
        public async Task<IActionResult> SetModeration(string slug, [FromQuery] string token, [FromBody] ModerationRequest request)
        {
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
                IsGuest = c.IsGuest,
                CanDelete = (identity.UserId != null && identity.UserId == c.UserId) || identity.IsModerator,
            };
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

            public bool IsGuest { get; set; }

            public bool CanDelete { get; set; }
        }

        /// <summary>The comment list plus per-post state for a single post.</summary>
        public class CommentsResponse
        {
            public bool CommentsDisabled { get; set; }

            public bool Hidden { get; set; }

            public bool CanModerate { get; set; }

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
    }
}
