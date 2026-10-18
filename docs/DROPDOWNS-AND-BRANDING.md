# Greeting-card and extra-product dropdowns — 2.2.0

This update starts from the merchant's October 18 export of WrapnWhim 2.1.1. Its saved templates, section settings, and Dondy WhatsApp app block are retained. The exported global settings schema was an empty array; this release restores its editor controls and adds the options below. Upload the new ZIP as an unpublished theme, preview it, and publish only after merchant review. No live Shopify theme has been changed.

## Greeting cards

Product forms now show **Greeting Occasion**, the help text **Select occasion for free greeting card**, and **Greeting Card Message** (250 characters with a counter). These are free line-item properties on the main gift; no paid card product is silently added. They persist in the real cart, checkout, and order properties. The previous generic Gift message block is suppressed where these fields are shown, avoiding duplicate inputs. Required existing name/instruction fields remain supported. Greeting fields also work with the existing native photo-upload form and without JavaScript.

Use **Customize → Theme settings → Greeting cards** to enable/disable the fields, edit the comma-separated occasion list, or change the helper text. The default list includes Birthday, Anniversary, Wedding, Congratulations, Thank You, Get Well Soon, New Baby, Graduation, Eid, and Just Because. The initial selection is empty; no occasion is assumed for a customer.

## Additional products

Under **Customize → Theme settings → Gift extras**, choose **Default extra products** from your real catalog (up to 12) and set the maximum quantity. The dropdown appears on eligible products once extras are configured. No real products can be preselected by this ZIP because your catalog was not included in the export.

**Offer configured extras on all eligible products** is enabled by default. Set `custom.gift_extras_enabled` to false to opt an individual parent out; set true to opt one in when the global setting is disabled. The optional `custom.gift_extras` list-of-products metafield overrides the defaults with a nonempty product list. Extra products' `custom.gift_extra_max_quantity` integer values override the theme-wide per-extra maximum. The [metafield setup guide](PRODUCT-EXTRAS.md) has exact definitions.

Customers use the **Additional products** dropdown to select actual product variants at current prices. Each chosen product appears below with a quantity control and Remove button. They may add multiple different products; choosing another variant of an already selected product replaces that product's variant, rather than silently adding a second card. Default-only variant titles are hidden in the selected card. Sold-out variants are disabled. No extra is initially selected. Paid greeting cards can be included here as ordinary products if desired; the free message/occasion fields do not change their prices.

The existing actual-variant AJAX addition, fresh catalog prechecks, unique grouping properties, cart reconciliation/recovery, discounted line totals, and Shopify checkout handoff are retained. Native photo-upload parents and subscription-only products retain their existing flow rather than claiming unsupported multi-item/file upload integration. Strict server-enforced bundles still require a compatible app/backend; see the integrity limits in PRODUCT-EXTRAS.md.

## Original logos

The wordmark and icon shown inline in the chat are not present as downloadable image assets in the provided ZIP or workspace. No replacement logo has been generated or falsely identified as the supplied artwork. Installing the exact original images remains pending their PNG/SVG files or Shopify CDN links.

The theme is ready for the originals under **Customize → Theme settings → Brand and typography**:

1. **Logo:** upload/select the original wordmark. It appears in the header and is reused in the footer automatically.
2. **Logo icon:** upload/select the gift-box icon. It sits beside the header wordmark and supplies the favicon if no separate favicon is selected.
3. **Footer logo:** optional separate artwork. The footer logo has a light backing so the supplied navy wordmark remains readable on the navy footer.
4. **Favicon:** optional separate optimized favicon; otherwise the icon above is used.

Images keep their original aspect ratio, use Shopify image delivery, and remain replaceable in the editor. Shopify Files are store resources and are not automatically bundled with theme exports.

## Verification

Run `npm run check`, `npm test`, `npm run test:browser`, `npm run test:extras`, and `npm run test:a11y`. The tests use isolated fixture products and mock Shopify APIs, which are excluded from the installable ZIP. Before publishing, select real extras and verify prices, stock, grouping, free greeting properties, checkout, and a merchant-approved test order in an unpublished Shopify theme. Actual store checkout/order tests require authenticated store access and remain unrun here.
