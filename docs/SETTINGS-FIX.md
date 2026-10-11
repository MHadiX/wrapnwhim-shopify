# WrapnWhim 2.0.1: settings and font compatibility fix

## Reported behavior

The merchant’s Shopify screenshot shows `font_url can only be used with a font drop` at the layout’s font-preload lines, serif body/navigation text, missing navy/beige backgrounds and an invisible primary CTA. The old layout passed font filters unconditionally and emitted blank CSS variables when global settings were missing. Those blank variables overrode the stylesheet defaults and invalidated the colors/font declarations.

## Correction

- Provide explicit brand/color, image-ratio and image-fit defaults in Liquid so blank imported settings cannot erase the base design.
- Use Georgia headings and Arial/Helvetica text by default, matching the provided design screenshots.
- Make Shopify font loading optional and call font filters only when a selected font exposes its family. Missing settings, empty values and legacy/raw string IDs fall back to the system stack.
- Preserve configured colors and editor selections; custom fonts remain available through the new checkbox and font pickers.
- Make the local font-filter test doubles reject invalid input, rather than masking the exact Shopify error seen in the screenshot.
- Add rendered-page regression coverage for absent settings, blank settings and invalid raw font values; check brand colors, CTA visibility/contrast, font families, media ratio and overflow.

## Install without losing editor content

The corrected layout/theme.liquid alone fixes the screenshot’s rendering problems and is safe to apply to the existing 2.0 theme after backing it up/duplicating it. The updated global schema adds the optional-font toggle. Preserve an existing merchant settings_data.json when applying a code-only patch. The complete WrapnWhim-2.0.1.zip is also available for installation as a new unpublished theme.

Menu entries, product names, photographs, collections and prices come from the merchant's Shopify resources. Preview screenshots use a labeled local test catalog; they are not content imported into Shopify.

## Verification limit

The cloud environment’s outbound proxy denied direct access to wrapnwhim.shop with HTTP 403. This fix reproduces the screenshot’s missing-setting/font conditions locally and is statically checked against Shopify rules; it has not been installed or verified live by the agent. Confirm the font-error text is gone, the navy announcement/primary button are visible and the beige hero fade is restored in the Shopify preview before publishing.
