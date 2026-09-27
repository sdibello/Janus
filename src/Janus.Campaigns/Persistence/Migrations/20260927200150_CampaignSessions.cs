using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Janus.Campaigns.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CampaignSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CampaignSessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    ProtectedTicket = table.Column<byte[]>(type: "BLOB", nullable: false),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampaignSessions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CampaignSessions_ExpiresAtUtc",
                table: "CampaignSessions",
                column: "ExpiresAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CampaignSessions");
        }
    }
}
