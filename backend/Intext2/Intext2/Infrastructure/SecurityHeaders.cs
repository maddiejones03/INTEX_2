using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Intext2.Infrastructure;

public static class SecurityHeaders
{
    public static IApplicationBuilder UseSecurityHeaders(
        this IApplicationBuilder app)
    {
        app.Use(async (context, next) =>
        {
            var policy =
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: blob:; " +
                "font-src 'self'; " +
                "connect-src 'self' " +
                    "https://jolly-moss-00018721e.5.azurestaticapps.net " +
                    "http://localhost:5173 " +
                    "http://localhost:3000; " +
                "frame-ancestors 'none';";

            context.Response.OnStarting(() =>
            {
                context.Response.Headers
                    ["Content-Security-Policy"] = policy;
                return Task.CompletedTask;
            });

            await next();
        });

        return app;
    }
}
