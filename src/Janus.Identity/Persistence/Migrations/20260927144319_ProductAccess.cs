using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Janus.Identity.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ProductAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductAccessRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    ProductId = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ResolvedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ResolvedByUserId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductAccessRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductAccessRequests_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductAccessRequests_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductAdministrators",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    ProductId = table.Column<string>(type: "TEXT", nullable: false),
                    AppointedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductAdministrators", x => new { x.UserId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_ProductAdministrators_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductAdministrators_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductAccessRequests_ProductId",
                table: "ProductAccessRequests",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductAccessRequests_UserId_ProductId",
                table: "ProductAccessRequests",
                columns: new[] { "UserId", "ProductId" },
                unique: true,
                filter: "Status = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_ProductAdministrators_ProductId",
                table: "ProductAdministrators",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductAccessRequests");

            migrationBuilder.DropTable(
                name: "ProductAdministrators");
        }
    }
}
