# Merchant setup and deployment

## Install on an unpublished theme

Run `npm ci`, `npm run check`, `npm test`, and `npm run package`. Upload the resulting `WrapnWhim-1.0.0.zip` in Shopify Admin → Online Store → Themes → Add theme. Alternatively:

```sh
npx shopify theme push --store your-store.myshopify.com --unpublished
```

Authenticate interactively with a Shopify account authorized for the store. Never commit a Theme Access password or Admin API credential. Review the theme in Shopify's preview and editor before publishing in Admin. No live deployment has been performed by this project.

## Merchant settings

1. Set the store currency to **PKR** in Shopify settings. Theme prices use Shopify's presentment currency and do not perform or pretend a currency conversion. Review international Markets if enabled.
2. Configure Pakistan shipping zones, supported cities, delivery rates, taxes and pickup/delivery settings in Admin. City/address fields are handled by Shopify checkout.
3. Enable COD only if you actually accept it. Set up online providers available to your Pakistani business; do not assume Shopify Payments is available. Theme payment icons come from `shop.enabled_payment_types`.
4. Set customer-account type in Admin. Header account links use `routes.account_url`; new accounts are hosted by Shopify. Classic templates are included for stores that enable classic accounts.
5. Add genuine shipping, returns, privacy and terms policies in Admin. Footer policy links appear automatically when policy content exists. Have the merchant review policies; the theme does not invent legal commitments.
6. In theme settings set logos, favicon, fonts, colors, delivery/payment messages and an international WhatsApp number using digits only, e.g. a Pakistan number beginning `92` without a local leading zero. Leave it empty to hide WhatsApp. Add actual support email, phone and social URLs in Footer/Contact sections.

## Products and collections

Create real products, images, variants, prices, inventory, tax and shipping classifications. Assign the default product template, or `personalized` where required. Add variant photos for each meaningful color, wrapping or card design. Upload photographs matching the actual product; the bundled imagery is decorative demo content.

Create the category and occasion collections you sell. The homepage includes all requested category/occasion titles, but **no collection handle is assumed**: select each collection or link in the card's editor block. Until configured, cards route to the collection directory. Select collections in featured products and best sellers. No invented products or prices are rendered if a collection is missing.

Install Shopify Search & Discovery (Shopify's supported free app) or configure native storefront filters using your supported Admin interface. Enable Availability, Price, Product type and any relevant product-option/metafield filters. The theme renders `collection.filters` and `search.filters`, sorts using Shopify's `sort_options`, and paginates. Empty filter lists mean the merchant has not enabled applicable filters, or Shopify does not support filters for that collection.

## Pages and navigation

Create pages in Admin and assign these theme templates:

| Merchant page | Template |
| --- | --- |
| About WrapnWhim | `page.about` |
| Contact | `page.contact` |
| FAQs | `page.faq` |
| Personalized gifts landing page | `page.personalized` (select a collection in its featured section) |
| Gift box builder | `page.gift-box-builder` |
| Wishlist | `page.wishlist` |
| Order tracking | `page.order-tracking` |
| Account entry, if needed | `page.account` |
| Shipping, returns, privacy, terms content pages | `page.shipping`, `page.returns`, `page.privacy`, `page.terms` |

Shopify's own policy pages remain the authoritative policies linked at checkout. Assign real titles and page content; the theme does not create Admin resources automatically. FAQ blocks are editable in the FAQ section. Tracking guides shoppers to Shopify order-status links and account order history; it does not fabricate shipment data. Set the contact-page setting in the tracking section.

Build a main menu with Home, Shop, Categories, Personalized Gifts, Gift Boxes, Occasions, About Us and Contact. Add nested categories/occasions to create the desktop mega menu and mobile submenus. Select the menu in Header. Header search, wishlist, account and cart controls are separate from merchant menu entries. Set footer menus for quick links and customer support.

## Editor configuration

- Slideshow: five example slides, separate desktop/mobile image pickers, headings, text placement, buttons, speed and optional autoplay. Replace each demo image. Autoplay is off by default and respects reduced motion.
- Editorial promotions: image pickers, text, color scheme, full-width/split layout, CTA. Link "Create your gift" to the personalized collection and "Build your gift box" to your actual builder page.
- Countdown: optional ISO timestamp **including a timezone**, e.g. `2027-03-01T23:59:00+05:00`. Ended offers display "This offer has ended". A timer is informational; discounts must be configured in Shopify separately.
- Testimonials: add only consented genuine reviews. Demonstration labels are on by default for added review blocks. The shipped homepage contains no invented customer endorsements.
- Inspiration gallery: upload managed images and actual destination links. There is no live Instagram API integration or scrape.
- Newsletter/contact: native Shopify forms, validation, marketing subscription fields and rendered success/errors. Complete live submission and consent tests before launch.

Configure the builder and product metafields as described in [INTEGRATIONS.md](INTEGRATIONS.md), then complete [QA.md](QA.md). Publish only after live-store checks and merchant content review.
