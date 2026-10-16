using System.Globalization;
using System.Numerics;

namespace Janus.Domain;

public static class GameNumberInput
{
    public static bool TryInitiative(string? input, out string? canonical)
    {
        canonical = null;
        if (input is null) return true;
        if (input.Length > NumericInputLimits.MaxCharacters) return false;
        if (input.Trim().Length == 0) return true;
        var trimmed = input.Trim();
        if (trimmed.AsSpan().IndexOfAnyExceptInRange('0', '9') >= 0
            && !(trimmed.Length > 1 && (trimmed[0] == '+' || trimmed[0] == '-')
                && trimmed.AsSpan(1).IndexOfAnyExceptInRange('0', '9') < 0)) return false;
        if (!BigInteger.TryParse(trimmed, NumberStyles.AllowLeadingSign,
                CultureInfo.InvariantCulture, out var value)) return false;
        canonical = value.ToString(CultureInfo.InvariantCulture);
        return true;
    }

    public static bool TryHp(string? input, out string? canonical)
    {
        canonical = null;
        if (input is null) return true;
        if (input.Length > NumericInputLimits.MaxCharacters) return false;
        if (input.Trim().Length == 0) return true;
        if (!ExactDecimal.TryParse(input, out var value)) return false;
        canonical = value.ToString();
        return true;
    }

    public static bool TryAdjustHp(ExactDecimal previous, ExactDecimal amount, bool heal,
        out string? canonical)
    {
        var updated = heal ? previous.Add(amount) : previous.Subtract(amount);
        canonical = updated.ToString();
        if (canonical.Length <= NumericInputLimits.MaxCharacters) return true;
        canonical = null;
        return false;
    }
}
