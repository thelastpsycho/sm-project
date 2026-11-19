# MCP OAuth

The MCP endpoint supports OAuth authorization code with S256 PKCE and dynamic
registration for public clients. Existing MCP API keys still work. OAuth uses
the existing Firebase sign-in, then asks the user to approve the connection.
Users need the `mcp:access` permission. The server checks the current account
and its permissions when it issues tokens and handles MCP requests.

## Enable on Vercel

1. Deploy the updated `firestore.rules` to the Firebase project used by Vercel.
   The OAuth service depends on those rules to protect Team & Access role
   assignments from self-edits. Verify existing roles in Team & Access.
2. Set `MCP_OAUTH_ORIGIN=https://sm.anvayabali.com` on the production Vercel
   deployment and redeploy. Use the exact HTTPS origin clients connect to, with
   no path. Use a separate Firebase test project for a preview deployment.
3. Optionally enable Firestore TTL on `mcpOAuth.expiresAt` to clean up expired
   requests, codes, and tokens. Expiration is enforced even without TTL.
4. Add `https://sm.anvayabali.com/api/mcp` to the MCP client, select OAuth and
   automatic client registration, then approve the connection using an account
   with MCP access. Check that the client can list and call its permitted tools.

Protected resource discovery is available at
`/.well-known/oauth-protected-resource/api/mcp`, with a host-level fallback
at `/.well-known/oauth-protected-resource`. Authorization server discovery is
at `/.well-known/oauth-authorization-server`. The client must send the exact
registered redirect URI and use S256 PKCE. If it sends a resource indicator,
it must match the full MCP endpoint URL.

Access tokens expire after one hour. Refresh tokens rotate on use and expire
90 days after authorization. Reuse of a spent refresh token closes the session.
The client can revoke its active token pair at
`/oauth/revoke`. Disabling a Firebase account or removing its MCP permission
also blocks OAuth access.
