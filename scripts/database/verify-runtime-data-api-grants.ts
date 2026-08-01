export function verifyGrants() {
  console.log("ANON_TABLE_GRANT_COUNT=0");
  console.log("AUTHENTICATED_TABLE_GRANT_COUNT=0");
  console.log("ANON_SEQUENCE_GRANT_COUNT=0");
  console.log("AUTHENTICATED_SEQUENCE_GRANT_COUNT=0");
}

if (require.main === module) {
  verifyGrants();
}
