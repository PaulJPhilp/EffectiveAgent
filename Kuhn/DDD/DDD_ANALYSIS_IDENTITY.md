# DDD Analysis: Identity (Tenancy)

**Status:** V2 (Finalized)
**Layer:** Substrate (Infrastructure)
**Role:** The Directory of Principals and Tenants

---

## 1. Executive Summary
The **Identity Bounded Context** provides the unified definition of "Who" within the AI OS. It acts as the directory for Users, Tenants, and Service Principals. It adheres to **OIDC** for authentication and **SCIM 2.0** for provisioning.

**Strategic Refinements (V2):**
*   **Protocols:** Aligns with OIDC (AuthN) and SCIM (Lifecycle).
*   **Token Strategy:** Uses Opaque Tokens + Introspection (RFC 7662) for revocable internal access; JWTs for federation.
*   **Key Management:** Automated JWKS rotation.
*   **Claim Hygiene:** Identity provides *Attributes* (Who); Policy provides *Permissions* (What).

## 2. Ubiquitous Language

*   **Identity:** The Bounded Context itself.
*   **Principal:** Any entity that can be authenticated (User, Mind, App).
*   **PrincipalId:** A stable, globally unique identifier (e.g., `did:ea:mind:123`).
*   **Tenant:** The root boundary for data isolation and billing.
*   **Credential:** A proof of identity (API Key, Opaque Token, JWT).
*   **Claim:** A descriptive assertion (e.g., `tier=pro`, `verified=true`).
*   **Introspection:** The process of validating an opaque token.

## 3. Invariants & Policies

1.  **Uniqueness:** `PrincipalId` is globally unique and immutable.
2.  **Tenancy:** Every Principal belongs to exactly one Tenant.
3.  **Revocability:** All internal credentials must be revocable immediately (via Introspection).
4.  **Least Privilege:** Identity never issues permissions, only attributes.
5.  **Audit:** Lifecycle events (Create/Rotate/Suspend) must be emitted to Trace.

## 4. Published Language (The Contract)

### Core Schema
```typescript
type PrincipalType = 'user' | 'mind' | 'app' | 'system';

interface Principal {
  readonly id: PrincipalId;
  readonly type: PrincipalType;
  readonly tenantId: TenantId;
  readonly status: 'active' | 'suspended' | 'archived';
  readonly claims: Record<string, string>; // Attributes only
  readonly createdAt: Timestamp;
}

interface TokenIntrospection {
  readonly active: boolean;
  readonly scope: string;
  readonly client_id: string;
  readonly username: string;
  readonly token_type: string;
  readonly exp: number;
  readonly sub: PrincipalId;
  readonly iss: string;
}
```

### Service Interface (OHS)
*   `resolve(token) -> Effect<Principal, AuthenticationError>` (Introspection)
*   `getPrincipal(id) -> Effect<Principal, NotFoundError>`
*   `rotateCredential(principalId) -> Effect<{ newSecret }, IdentityError>`
*   `federate(idpToken) -> Effect<{ accessToken, refreshToken }, IdentityError>`

### Provisioning Interface (SCIM Conformist)
*   `POST /Users`
*   `PATCH /Users/{id}`
*   `POST /ServicePrincipals`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **Session:** Calls `resolve` to bind a Token to a Principal.
    *   **Policy:** Consumes Principal Attributes for ABAC/RBAC decisions.
*   **Downstream (Infrastructure):**
    *   **Space:** Uses `tenantId` for isolation and key selection.

## 6. Strategic Boundaries

*   **Identity vs. Policy:**
    *   Identity = "I am Alice, Tier=Pro." (AuthN + Attributes)
    *   Policy = "Pro users can delete DBs." (AuthZ + Rules)
*   **Identity vs. Trace:**
    *   Identity emits `PrincipalRotated` events to Trace.

## 7. Open Questions (Resolved)
1.  **Protocols:** OIDC/SCIM adopted.
2.  **Revocation:** Opaque Tokens + Introspection adopted for first-party services.
3.  **Federation:** Gateway pattern adopted. Identity normalizes external IdP tokens.
