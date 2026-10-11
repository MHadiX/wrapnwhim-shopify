# Personalization, uploads and gift boxes

## Required product metafields

Create definitions in Shopify Admin → Settings → Custom data → Products. Enable storefront access where your Admin offers that setting.

| Namespace/key | Type | Purpose |
| --- | --- | --- |
| `custom.personalization_enabled` | Boolean | Shows configurable text personalization fields on the default product template. The `personalized` template enables them without this flag. |
| `custom.photo_upload_enabled` | Boolean | Enables a native product-property file input; also enables the personalization fieldset. |
| `custom.care_instructions` | Rich text | Optional product accordion. |
| `reviews.rating` | Rating | Optional compatible review-app rating. |
| `reviews.rating_count` | Integer | Optional review count. No rating is displayed if absent. |

Text field blocks in Product details control labels, required state, character limits, multiline input and illustrative preview placement. Labels become the **order property keys**; make labels unique within each product template. Create alternate product templates in the editor for different field sets, such as Name, Short quote, Special date, Initials, Greeting-card message and Special delivery instructions. Default fields are Recipient name, Gift message and Special instructions, plus an optional Occasion.

The preview uses `textContent`, not executable customer HTML. It is explicitly illustrative. Selected variant images are the visual preview for color/design/wrapping. The theme does not promise an exact physical engraving simulation.

## Real paid wrapping and cards

Line-item properties cannot change payable prices. For a product, make `Wrapping` and/or `Card design` real Shopify product options with actual priced variants and variant photos. Include a `No card`/`Standard` combination when appropriate. Variant switching chooses the real ID, image, stock state, SKU and price. Shopify charges that variant's price.

For the gift box builder, configure independent wrapping and greeting-card products. Every selected component has its own actual price and inventory. No JavaScript surcharge, hidden monetary property, or invented discount is used. Configure shipping/tax treatment for add-on products appropriately.

## Photo uploads

When `custom.photo_upload_enabled` is true, the product form submits its `properties[Personalization photo]` file using Shopify's native `multipart/form-data` product-form flow. **It does not send uploaded files through the Ajax cart API or store a temporary browser blob as an order property.** Shopify associates the stored file URL with the line item. The shopper is taken through Shopify's native add-to-cart/full-cart flow. Personalization properties are displayed in the cart and on classic account order pages.

- Supported client-side file checks: JPG/PNG/WebP MIME type, nonempty file, configurable size ceiling (1–20 MB), optional required state and a local object-URL preview.
- Local object URLs are revoked when replaced or removed; they are only previews and are never sent as durable URLs.
- Shopify's server remains responsible for the actual upload/storage contract. Client-side type and size checks can be bypassed and are usability checks, not a backend malware scanner or content moderation service.
- Uploaded file links may be accessible to anyone with the link. Ask only for artwork/photos needed for the purchased gift. Do not request identity documents, medical data or private credentials. Inform shoppers through your reviewed privacy policy and establish retention/deletion practices.
- **Required launch test:** place a test order with a photo, refresh the cart, change quantity, complete checkout, and inspect the actual stored file link and properties in Admin. This cannot be verified without a Shopify store. Respect the store's platform upload limits; reduce the editor ceiling if needed.

If private expiring file access, server-side scanning, direct app upload, cropping proofs, or retention enforcement is required, install a supported upload/personalization app or build an authenticated backend. Such an integration must use signed limited upload requests, server-side file/content/size validation, authorization, stable order references and deletion policies. No backend credentials or app endpoint are invented in this theme.

## Gift box architecture: separate real cart lines

The builder is a six-step UI (box/style, gifts, wrapping, card, message, review) that uses the Shopify Ajax Cart API's `items` array. The actual configuration consists of:

- One box product; its variants are the sizes/styles.
- One gift-items collection (up to 50 configured products).
- Optional wrapping product blocks.
- Optional greeting-card product whose variants are designs.
- Editable minimum/maximum total gift-item quantities.

Each selected variant is rendered from actual Liquid product data. Before adding, the UI fetches the selected products' public `.js` endpoints and rechecks availability, quantity rules and prices. A changed price requires another review. Shopify performs authoritative inventory and price validation on the add request; availability checks are not stock reservations.

The builder attaches `_gift_box_id`, `_gift_box_role` and the visible `Gift box reference` to all component lines. The box line receives the message/occasion; recipient name is repeated for fulfillment clarity. All components remain separate taxable/shippable products. The subtotal is the sum of variant prices × quantities, and Shopify owns checkout discounts/tax/shipping.

Draft selections and text are kept in **sessionStorage on this browser/tab** during the flow. Reload restores valid selections; successfully adding clears the persisted draft. Text never leaves the browser until adding to Shopify cart. No account or cross-device draft sync is claimed.

Products requiring text/photo personalization or a selling plan are excluded from the builder and link to their product pages. Configure simple products for box/wrapping/card roles. Do not put subscription-only products or separate required personalization forms in those roles.

### Fulfillment and limitations to review before launch

This is a merchant-assembled gift set, **not Shopify Bundles, a Cart Transform parent line, or an atomic bundle SKU**. The merchant must group order lines with the same visible reference and assemble that box. Ordinary line quantity changes/removals preserve their properties but can alter or break the selected set. A shopper may edit individual components in the cart. UI item limits are not security controls and are not enforced at checkout. Fulfillment should contact a shopper if an edited order lacks its box or violates your packing rules; do not silently substitute products.

If an inseparable bundle SKU, per-size capacity enforcement, checkout-level validation, bundle-level discounts, or a single-parent inventory/return contract is a business requirement, integrate a supported bundle app or a Shopify app using the appropriate Cart Transform/bundle APIs and Cart/Checkout Validation Function. Check app/plan/API eligibility with the provider. Server validation must verify component membership, min/max quantities, inventory rules and paid add-ons. Do not trust prices or grouping properties supplied by a browser. This backend app is not implemented or authenticated in the theme.

### Other optional integrations

- Reviews: a compatible Shopify review app providing `reviews.rating`/`rating_count`, and genuine reviews in the editor or app blocks.
- Wishlist account sync: requires an authorized customer-account app/backend. Current implementation is guest browser storage only.
- Live Instagram: requires a supported authenticated integration and authorization; current gallery is manual.
- Shipment tracking: Shopify order status and fulfillment tracking URLs are supported. Dedicated carrier lookup requires an authorized tracking app/backend.

No paid app is required for the theme's basic variants, cart, search, contact, newsletter or browser wishlist. Native uploads and the component builder must pass the documented store/fulfillment checks before accepting real orders.
