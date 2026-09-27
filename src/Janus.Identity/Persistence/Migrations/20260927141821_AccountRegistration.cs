using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Janus.Identity.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AccountRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "EmailIndex",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<string>(
                name: "PendingProductId",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LocalMailMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Recipient = table.Column<string>(type: "TEXT", nullable: false),
                    Subject = table.Column<string>(type: "TEXT", nullable: false),
                    ActionUrl = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocalMailMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductGrants",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    ProductId = table.Column<string>(type: "TEXT", nullable: false),
                    GrantedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductGrants", x => new { x.UserId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_ProductGrants_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductGrants_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RegistrationInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TokenHash = table.Column<string>(type: "TEXT", nullable: false),
                    ProductId = table.Column<string>(type: "TEXT", nullable: false),
                    IssuedByUserId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegistrationInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RegistrationInvitations_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "Id", "Name" },
                values: new object[] { "janus-campaigns", "Janus campaigns" });

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LocalMailMessages_CreatedAtUtc",
                table: "LocalMailMessages",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ProductGrants_ProductId",
                table: "ProductGrants",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_RegistrationInvitations_ProductId",
                table: "RegistrationInvitations",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_RegistrationInvitations_TokenHash",
                table: "RegistrationInvitations",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LocalMailMessages");

            migrationBuilder.DropTable(
                name: "ProductGrants");

            migrationBuilder.DropTable(
                name: "RegistrationInvitations");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropIndex(
                name: "EmailIndex",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "PendingProductId",
                table: "AspNetUsers");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");
        }
    }
}
