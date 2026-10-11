# WrapnWhim 2.0.0 storefront rebuild

Visual direction: modern premium shop, as selected by the merchant. The uploaded Horizon export remains a compatibility reference only; its design and merchant data were not imported.

## New composition

- One compact sticky header with the wordmark, desktop navigation and shopping controls in a single row; a dedicated drawer on phones and tablets.
- Full-width photographic hero, concise headlines, primary and secondary configurable links, keyboard/swipe controls, and separate mobile images/content positioning.
- Actual featured products immediately after the hero and service highlights; no invented catalog data.
- Clean portrait product photography without decorative image frames, optional product type, readable titles/prices, real sale/sold-out badges, a wishlist control, and visible purchase/quick-view controls below the card.
- Eight initially visible photographic category cards in four desktop columns, with the remaining four accessible through a native expansion control.
- Eleven occasion destinations presented as smaller round photographic tiles in a horizontal row.
- Warm split promotions, quieter spacing, a compact collection heading and native filters, white product/cart surfaces, and consistent form controls.
- More compact gift-box choices and a persistent review summary; actual component prices and stock validation retained.
- Optional separate footer logo, configurable footer newsletter and native fallback shopping links rather than blank footer groups.

## Functional mobile purchase bar

The mobile product bar mirrors the selected variant’s price and availability. Its button calls the same product form’s native requestSubmit flow, including required customization and photo validation. Text properties use the existing Shopify cart request; selected photo uploads retain native multipart submission. The primary purchase button remains available without JavaScript; the additional bar is not rendered as an active control until JavaScript initializes it. The bar hides when the primary purchase control is visible and on desktop. The setting is editable in each product section.

## Validation and launch

See QA.md for current test evidence and pending Shopify-store checks. Automated checks cannot prove that an arbitrary merchant configuration is error-free; real store validation remains required for checkout, file retention, native emails, inventory and customer accounts.

Upload WrapnWhim-2.0.1.zip as an unpublished theme, configure real collections/product imagery/navigation, and preview every template before publishing. Prior ZIP versions remain separate. Existing merchant content from the uploaded export is not migrated automatically.

The 2.0.1 compatibility patch guards missing/invalid font settings and restores brand defaults without requiring initialized global settings. See SETTINGS-FIX.md for the exact problem and a layout-only upgrade that preserves merchant customization.
