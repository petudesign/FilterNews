# FilterNews

FilterNews is a small Chrome extension that softens heavy news topics so they are not the most visually prominent content on the page.

## What it does

- Detects likely news cards and article previews on web pages.
- Looks for keywords related to selected topics: war, violence, accidents, crime, and politics.
- Supports custom filter words, which are shown as removable tags in the popup.
- Custom words with at least 4 characters also match the beginning or end of compound words. For example, `virus` matches words like `viruskaaos` and `koronavirus`.
- Some custom words include lightweight word-family logic. For example, `kuolema` also matches forms such as `kuollut`, `kuolleena`, and `kuoli`.
- A site list limits usage to selected domains. If the list is empty, FilterNews works on all websites.
- Lets the user choose whether matching items are blurred or hidden.
- Adds a “Show anyway” button to every filtered item.
- Saves settings to Chrome sync storage.

## Note

The first version uses only local keyword matching. It does not send page content anywhere and does not use an external AI service.
