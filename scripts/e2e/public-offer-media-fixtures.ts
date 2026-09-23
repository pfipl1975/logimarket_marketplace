export const E2E_OFFER_FIXTURES = [
  {
    offerId: 880001,
    title: "E2E Multi Image Offer",
    publicationStatus: "published",
    media: [
      { id: 881001, path: "multi/1.jpg", sortOrder: 0, isPrimary: true },
      { id: 881002, path: "multi/2.jpg", sortOrder: 1, isPrimary: false },
      { id: 881003, path: "multi/3.jpg", sortOrder: 2, isPrimary: false },
    ],
  },
  {
    offerId: 880002,
    title: "E2E Single Image Offer",
    publicationStatus: "published",
    media: [
      { id: 881004, path: "single/1.jpg", sortOrder: 0, isPrimary: true },
    ],
  },
  {
    offerId: 880003,
    title: "E2E Zero Image Offer",
    publicationStatus: "published",
    media: [],
  },
  {
    offerId: 880004,
    title: "E2E Archived Offer",
    publicationStatus: "archived",
    media: [
      { id: 881005, path: "archived/1.jpg", sortOrder: 0, isPrimary: true },
    ],
  },
];

export async function insertOfferMediaFixtures(client: import("pg").PoolClient) {
  // Insert common partner and category for these offers
  await client.query(`
    INSERT INTO partners (id, company_name, contact_email)
    VALUES (880000, 'E2E Offer Partner', 'partner@test.local')
    ON CONFLICT DO NOTHING
  `);

  await client.query(`
    INSERT INTO categories (id, name, slug)
    VALUES (880000, 'E2E Category', 'e2e-category')
    ON CONFLICT DO NOTHING
  `);

  for (const fixture of E2E_OFFER_FIXTURES) {
    await client.query(`
      INSERT INTO offers (id, partner_id, category_id, title, publication_status, price_on_request, is_active)
      VALUES ($1, 880000, 880000, $2, $3, true, true)
    `, [fixture.offerId, fixture.title, fixture.publicationStatus]);

    for (const media of fixture.media) {
      // Use media id to generate a unique but deterministic SHA256 checksum
      const mockChecksum = `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8${media.id.toString().padStart(2, '0')}`;
      await client.query(`
        INSERT INTO offer_media (
          id, offer_id, storage_bucket, object_path, source_type, mime_type, size_bytes, checksum_sha256, sort_order, is_primary
        ) VALUES (
          $1, $2, 'offer-media', $3, 'upload', 'image/jpeg', 1024,
          $4,
          $5, $6
        )
      `, [media.id, fixture.offerId, media.path, mockChecksum, media.sortOrder, media.isPrimary]);
    }
  }
}
