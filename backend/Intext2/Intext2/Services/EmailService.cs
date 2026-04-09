using System.Net;
using System.Net.Mail;

namespace Intext2.Services;

public class SmtpSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Laya Foundation";
    public bool EnableSsl { get; set; } = true;
}

public interface IEmailService
{
    Task SendDonationConfirmationAsync(string toEmail, string donorName, string donationType, string details);
}

public class EmailService : IEmailService
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<EmailService> _logger;
    private readonly bool _isConfigured;

    public EmailService(SmtpSettings settings, ILogger<EmailService> logger)
    {
        _settings = settings;
        _logger = logger;
        _isConfigured = !string.IsNullOrWhiteSpace(settings.Host)
                     && !string.IsNullOrWhiteSpace(settings.Username)
                     && !string.IsNullOrWhiteSpace(settings.Password);
    }

    public async Task SendDonationConfirmationAsync(
        string toEmail, string donorName, string donationType, string details)
    {
        if (!_isConfigured)
        {
            _logger.LogWarning("SMTP not configured — skipping confirmation email to {Email}", toEmail);
            return;
        }

        var subject = donationType == "Time"
            ? "Thank you for pledging your time — Laya Foundation"
            : "Thank you for your in-kind donation — Laya Foundation";

        var body = BuildHtmlBody(donorName, donationType, details);

        try
        {
            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                Credentials = new NetworkCredential(_settings.Username, _settings.Password),
                EnableSsl = _settings.EnableSsl,
            };

            var message = new MailMessage
            {
                From = new MailAddress(_settings.FromAddress, _settings.FromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true,
            };
            message.To.Add(toEmail);

            await client.SendMailAsync(message);
            _logger.LogInformation("Confirmation email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send confirmation email to {Email}", toEmail);
        }
    }

    private static string BuildHtmlBody(string donorName, string donationType, string details)
    {
        var typeLabel = donationType == "Time" ? "Volunteer Time" : "In-Kind Goods";
        var nextSteps = donationType == "Time"
            ? "Our volunteer coordinator will reach out within 2 business days to schedule your sessions and match you with a program."
            : "Our team will contact you within 2 business days to arrange drop-off or pick-up of your donated items.";

        return $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;"">
  <div style=""background: #4f8a68; padding: 24px 32px; border-radius: 8px 8px 0 0;"">
    <h1 style=""color: #fff; font-size: 20px; margin: 0;"">Laya Foundation</h1>
    <p style=""color: rgba(255,255,255,0.8); font-size: 14px; margin: 4px 0 0;"">Thank you for your support</p>
  </div>
  <div style=""background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;"">
    <p style=""font-size: 16px; margin: 0 0 16px;"">Dear {donorName},</p>
    <p style=""font-size: 14px; line-height: 1.7; margin: 0 0 16px;"">
      Thank you for your generous <strong>{typeLabel}</strong> donation. Your contribution makes a real difference
      in the lives of survivors in our care.
    </p>
    <div style=""background: #f1f5f9; border-radius: 6px; padding: 16px; margin: 0 0 16px; font-size: 13px; line-height: 1.6;"">
      <strong>Donation Details</strong><br/>
      {details}
    </div>
    <p style=""font-size: 14px; line-height: 1.7; margin: 0 0 16px;"">
      <strong>What happens next?</strong><br/>
      {nextSteps}
    </p>
    <p style=""font-size: 14px; line-height: 1.7; margin: 0;"">
      With gratitude,<br/>
      <strong>The Laya Foundation Team</strong>
    </p>
  </div>
  <p style=""text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;"">
    This is an automated confirmation. Please do not reply to this email.
  </p>
</div>";
    }
}
