using System.Text.Json;

namespace Janus.Domain;

public sealed record ConditionDefinition(string Kind, string Label, string Summary, string Source, bool Core);

public static class ConditionCatalog
{
    public static IReadOnlyList<ConditionDefinition> All { get; } = Load();
    private static readonly HashSet<string> Allowed = All.Select(item => item.Kind).ToHashSet(StringComparer.Ordinal);

    public static bool Contains(string? kind) => kind is not null && Allowed.Contains(kind);

    private static IReadOnlyList<ConditionDefinition> Load()
    {
        using var stream = typeof(ConditionCatalog).Assembly.GetManifestResourceStream("Janus.Domain.conditions.json")
            ?? throw new InvalidOperationException("The condition catalog is missing.");
        var definitions = JsonSerializer.Deserialize<ConditionDefinition[]>(stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("The condition catalog is empty.");
        return Array.AsReadOnly(definitions);
    }
}
