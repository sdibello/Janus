using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Janus.Identity.Persistence;

public sealed class JanusUser : IdentityUser
{
}

public sealed class IdentityDataContext(DbContextOptions<IdentityDataContext> options)
    : IdentityDbContext<JanusUser, IdentityRole, string>(options)
{
}
