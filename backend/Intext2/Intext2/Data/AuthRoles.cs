namespace Intext2.Data;

public static class AuthRoles
{
    public const string Admin        = "Admin";
    public const string CaseManager  = "CaseManager";
    public const string Donor        = "Donor";

    /// <summary>Former seeded role name; migrated to <see cref="Donor"/> on startup.</summary>
    public const string LegacyCustomer = "Customer";
}
