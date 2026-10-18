# Catalog extras and gift messages — WrapnWhim 2.2.0

## Install safely

Upload `WrapnWhim-2.2.0.zip` under **Online Store → Themes → Add theme → Upload ZIP**. Preview this unpublished theme with your real catalog before publishing. Publishing is a separate merchant action; this release does not change your live theme or merchant settings. For an existing 2.0.1 installation, uploading a separate theme is safest: transfer your existing editor settings and product templates, and configure the new Gift extras settings. Existing product metafields remain on products.

## Admin configuration (no source editing)

Under **Settings → Custom data → Products → Add definition**, create these product metafields. Use the exact namespace/key, enable storefront access if offered, and save:

| Name | Namespace/key | Type | Purpose |
|---|---|---|---|
| Enable gift extras | `custom.gift_extras_enabled` | True or false (`boolean`) | False opts a parent out; true opts it in. A missing value follows the global offer-on-all setting (enabled by default). |
| Gift extra products | `custom.gift_extras` | Product, **list of products** (`list.product_reference`) | Optional per-parent extras; add a maximum validation of 12 references. Order controls display order. |
| Maximum extra quantity | `custom.gift_extra_max_quantity` | Integer (`number_integer`) | On each extra product, optional positive maximum. Recommended validation minimum 1, maximum 20. |

In **Customize theme → Theme settings → Gift extras**, choose **Default extra products** (up to 12) and **Default maximum quantity per extra** (1–20). By default all eligible parent products without a nonempty per-product reference list inherit these defaults. Disable Offer configured extras on all eligible products to require explicit per-product opt-in. To hide extras completely on a parent, set its enable metafield false; an empty reference list means “use defaults.” When no extras are configured, the paid extras panel is hidden. Independent free greeting fields remain available.

Publish extra products to the Online Store sales channel and make them available in the shopper's market. Manage their images, prices, stock, options, continue-selling policy, and quantity rules normally in Products. No duplicate price database exists. Shopify variant availability respects continue-selling; a true availability flag does not promise a particular stock quantity. Submit-time Shopify inventory checks are authoritative.

The storefront excludes the main product itself, subscription-only products, and extras requiring personalization or photo uploads. Such products require their own configuration and cannot safely act as plain accessory lines. Additional gift-message inputs appear once: the existing customization block named exactly “Gift message” is replaced by this feature's optional 250-character message. Other existing personalization fields and required validation remain intact; “Recipient name” for product personalization remains separate from the optional “Gift recipient.” Disable express checkout on eligible products automatically so customers cannot bypass selected extras.

**Photo-upload parent products and subscription-only parent products retain their existing product form and do not show this AJAX extras panel.** The existing photo upload submits through Shopify's native multipart form, keeping the purchased file associated with the order. Supporting uploaded files together with this multi-item flow requires a supported persistent upload app/backend returning an order-safe file URL. This release does not claim that integration is complete or replace native uploads with browser-only storage.

## Customer and cart behavior

Nothing is selected on a fresh page load. The additional-products dropdown adds a selected card with a real variant and quantity constrained by both the merchant maximum and Shopify quantity rules. The message and names are optional. Prices use Shopify's money format, with store/presentment currency fallback. Totals are calculated with integer Shopify values and are informational before discounts, taxes, and shipping.

On submission, controls are temporarily locked; selected variants are reloaded from locale-aware product JSON endpoints. A price change requires reviewing the revised total and submitting again. Unavailable items and invalid quantities prevent the add. The main product and extras are sent together as real variant lines using the AJAX Cart API. Only a confirmed matching cart state produces success. No automatic retry of an ambiguous add request occurs.

Each submission receives a cryptographically generated `_wnw_group` reference and `_wnw_role` (`parent` or `extra`) private properties. A short public “Gift reference” on every component and “Gift for” on extras help explain association in checkout/order records. Private properties are grouping metadata, **not security controls**, and may be visible in order data. The gift message and sender/recipient are main-line properties, escaped in cart markup; dynamic previews use textContent.

The drawer and cart render extras immediately under their parent, independently of cart array order. Each line retains its actual price, quantity, and discount allocations. The group total sums `final_line_price` exactly once; cart-wide discounts remain in the separate bag subtotal. Extra quantity/removal controls update the actual line key. Changing parent quantity does not automatically multiply extras: accessories remain the quantities the customer explicitly selected.

Removing a parent through the JavaScript cart controls removes its group in a single keyed update, then verifies the returned cart. Checkout handoff also includes removal of children when their parent's edited quantity is zero. A child removed independently does not remove its parent. Refreshing or reloading uses properties in the actual Shopify cart, not transient client-side positions. Browser-restored controls are recalculated on pageshow; no gift messages are copied into persistent browser storage.

## Integrity limits and recovery

Shopify's separate-line cart API does **not** guarantee atomic bundles or strict parent/child enforcement. If an add fails or is partial, the theme checks the unique group and attempts to remove only that submission's lines, then verifies removal. If cleanup fails or the cart cannot be read, it explicitly asks the customer to review the bag before retrying. Fully confirmed lines after an interrupted add response are recognized as success without adding twice.

No theme can eliminate every race with other cart apps, another tab, lost connections, or external/native cart changes. JavaScript-disabled native cart edits can leave extras after parent removal. Orphan extras are visibly labeled in the cart and remain ordinary purchasable products; they can be retained independently or removed. Native quantities and checkout remain Shopify-authoritative. A compatible bundle app or Shopify Function/backend is required if the merchant needs strict server-side parent/child enforcement; none is represented as installed.

Ordinary product submission and free message properties still work without JavaScript. Selecting paid extras and the estimated summary require JavaScript and are hidden until it initializes. Checkout uses Shopify's supported native handoff. No checkout extensions, Shopify Plus, private credentials, external customer database, or payment overrides are required.

## Validate before publishing

Local fixture checks exercise the actual Liquid/JS against **mock Shopify APIs**, not a development store. Run:

```sh
npm ci --cache /tmp/wrapnwhim-npm
npm run check
npm test
npm run test:browser
npm run test:extras
npm run test:a11y
```

On an unpublished Shopify theme, assign real parent/extras metafields and verify: no extras; multiple/variant extras; quantity minima, increments and maxima; sold-out and continue-selling variants; live variant and main quantity changes; message/counter/required existing fields; different messages and different groups; extra quantity/removal; parent removal; refreshed cart and browser back; automatic and order discounts; stock changed during add; network failures; drawer and full cart; keyboard/touch/mobile; checkout line products/properties. Use a merchant-approved test payment order to verify final order properties. A true development/unpublished store test and order test remain **unrun** because authenticated store access has not been supplied. No real inventory, order, or payment success is inferred from fixtures.

Maintain grouping property names consistently across `gift-extras.js`, `theme.js`, and `cart-content.liquid`. Cart line rendering is shared in `cart-line.liquid`. Future cart integrations must preserve these properties and use line keys, never cart positions. The regression fixture is development-only and excluded from the distributable ZIP.
