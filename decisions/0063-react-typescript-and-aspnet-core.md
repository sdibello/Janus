# 0063: React with TypeScript and an ASP.NET Core backend

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

The owner prefers React and C#, requires local operation on Windows and Fedora, and plans to move to cloud hosting. The review proposed adding TypeScript to the React frontend and using ASP.NET Core for the C# API backend.

## Decision

Use React with TypeScript for the frontend and ASP.NET Core with C# for the backend API.

## Alternatives considered

- React without TypeScript: TypeScript was selected to help catch data-contract mistakes during development.
- A different backend language or framework: the selected approach fits the owner's preference and cross-platform requirements.

## Consequences

Frontend and backend implementation will use these technologies. Database, data-access tooling, identity implementation, build tooling, exact versions, and cloud provider remain undecided. Setup and validation must cover Windows and Fedora. No application code or tooling is introduced by this decision.
