namespace Rambler.Server
{
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;
    using Options;
    using System;
    using System.Net;
    using System.Net.Mail;
    using System.Threading.Tasks;

    public class EmailService
    {
        private readonly EmailOptions options;
        private readonly ILogger<EmailService> log;

        public EmailService(IOptions<EmailOptions> optionsAccessor, ILogger<EmailService> log)
        {
            options = optionsAccessor.Value;
            this.log = log;
        }

        /// <summary>
        /// True when SMTP is configured. When false, emails are skipped (e.g. local/dev).
        /// </summary>
        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(options?.EmailFrom) && !string.IsNullOrWhiteSpace(options?.Host);

        public async Task SendEmailAsync(string emailTo, string subject, string body, bool isBodyHtml = true)
        {
            // no SMTP configured (e.g. local/dev) -> skip sending rather than throwing,
            // so registration / password reset / email verification still succeed.
            if (string.IsNullOrWhiteSpace(options?.EmailFrom) || string.IsNullOrWhiteSpace(options?.Host))
            {
                log.LogWarning("Email is not configured (Email:From / Email:Host missing); skipping email to {emailTo} with subject '{subject}'.",
                    emailTo,
                    subject);
                return;
            }

            log.LogDebug($"Sending to {emailTo} from {options.EmailFrom} with subject '{subject}'",
                emailTo,
                options.EmailFrom,
                subject);

            var msg = new MailMessage(options.EmailFrom, emailTo, subject, body);
            msg.IsBodyHtml = isBodyHtml;

            try
            {
                using (var client = new SmtpClient(options.Host, options.Port))
                {
                    client.UseDefaultCredentials = false;
                    client.EnableSsl = true;
                    client.Credentials = new NetworkCredential(options.Username, options.Password);

                    await client.SendMailAsync(msg);
                }
            }
            catch (Exception ex)
            {
                log.LogError($"Failed sending to {emailTo} from {options.EmailFrom} with subject '{subject}', host: {options.Host}, port: {options.Port}, user: {options.Username}",
                    emailTo,
                    options.EmailFrom,
                    subject);
                throw;
            }
        }
    }
}
