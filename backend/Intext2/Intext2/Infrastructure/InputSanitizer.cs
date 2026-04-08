using System.Net;
using System.Reflection;

namespace Intext2.Infrastructure;

/// <summary>
/// Sanitizes all string properties on a model in-place:
///   1. Trims leading/trailing whitespace
///   2. HTML-encodes special characters (&lt; &gt; &amp; &quot; &#39;)
///
/// Returns a list of property names that are [Required] but empty after trimming.
/// Callers should reject the request if the list is non-empty.
/// </summary>
public static class InputSanitizer
{
    /// <summary>
    /// Sanitizes all public string properties on <paramref name="model"/>.
    /// Returns names of required-but-empty properties (if any).
    /// </summary>
    public static List<string> SanitizeAndValidate<T>(T model) where T : class
    {
        var emptyRequired = new List<string>();

        foreach (var prop in typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (prop.PropertyType != typeof(string)) continue;
            if (!prop.CanRead || !prop.CanWrite)     continue;

            var raw = (string?)prop.GetValue(model);

            // Null stays null — let EF / data-annotations handle nullability
            if (raw is null) continue;

            var trimmed  = raw.Trim();
            var encoded  = HtmlEncode(trimmed);
            prop.SetValue(model, encoded);

            // Check [Required] — report empty after trim
            var isRequired = prop.GetCustomAttribute<System.ComponentModel.DataAnnotations.RequiredAttribute>() is not null;
            if (isRequired && trimmed.Length == 0)
                emptyRequired.Add(prop.Name);
        }

        return emptyRequired;
    }

    // Equivalent to WebUtility.HtmlEncode but also encodes single-quote
    private static string HtmlEncode(string value)
    {
        // WebUtility encodes <, >, &, "  — we add ' manually
        return WebUtility.HtmlEncode(value).Replace("&#39;", "'").Replace("'", "&#39;");
    }
}
