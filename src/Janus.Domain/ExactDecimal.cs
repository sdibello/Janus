using System.Globalization;
using System.Numerics;

namespace Janus.Domain;

// A finite base-10 value. No binary floating point or fixed-width decimal conversion is used.
public readonly record struct ExactDecimal : IComparable<ExactDecimal>
{
    private ExactDecimal(BigInteger units, int scale)
    {
        if (units.IsZero)
        {
            Units = BigInteger.Zero;
            Scale = 0;
            return;
        }
        while (scale > 0 && units % 10 == 0)
        {
            units /= 10;
            scale--;
        }
        Units = units;
        Scale = scale;
    }

    public BigInteger Units { get; }
    public int Scale { get; }

    public static bool TryParse(string? input, out ExactDecimal value)
    {
        value = default;
        if (string.IsNullOrWhiteSpace(input)) return false;
        var text = input.Trim();
        var start = text[0] is '+' or '-' ? 1 : 0;
        if (start == text.Length) return false;
        var point = -1;
        var digitCount = 0;
        for (var index = start; index < text.Length; index++)
        {
            if (text[index] == '.' && point < 0) point = index;
            else if (text[index] >= '0' && text[index] <= '9') digitCount++;
            else return false;
        }
        if (digitCount == 0) return false;
        var digits = point < 0 ? text[start..] : string.Concat(text.AsSpan(start, point - start), text.AsSpan(point + 1));
        if (!BigInteger.TryParse(digits, NumberStyles.None, CultureInfo.InvariantCulture, out var units))
            return false;
        if (start == 1 && text[0] == '-') units = -units;
        value = new ExactDecimal(units, point < 0 ? 0 : text.Length - point - 1);
        return true;
    }

    public ExactDecimal Add(ExactDecimal other)
    {
        var scale = Math.Max(Scale, other.Scale);
        return new ExactDecimal(
            Units * BigInteger.Pow(10, scale - Scale)
            + other.Units * BigInteger.Pow(10, scale - other.Scale), scale);
    }

    public ExactDecimal Subtract(ExactDecimal other) => Add(new ExactDecimal(-other.Units, other.Scale));

    public int CompareTo(ExactDecimal other)
    {
        var scale = Math.Max(Scale, other.Scale);
        return (Units * BigInteger.Pow(10, scale - Scale))
            .CompareTo(other.Units * BigInteger.Pow(10, scale - other.Scale));
    }

    public override string ToString()
    {
        if (Scale == 0) return Units.ToString(CultureInfo.InvariantCulture);
        var digits = BigInteger.Abs(Units).ToString(CultureInfo.InvariantCulture).PadLeft(Scale + 1, '0');
        return string.Concat(Units.Sign < 0 ? "-" : "", digits.AsSpan(0, digits.Length - Scale),
            ".", digits.AsSpan(digits.Length - Scale));
    }

    public string? Status => CompareTo(MinusTen) <= 0 ? "AliveAdjacent"
        : CompareTo(Zero) < 0 ? "Dying" : CompareTo(Zero) == 0 ? "Disabled" : null;

    public static ExactDecimal Zero => new(BigInteger.Zero, 0);
    private static ExactDecimal MinusTen => new(new BigInteger(-10), 0);
}
