# YouTube Embed and Audience Review

Reviewed 2026-09-25 for the Phase 1 student web application.

## Decision and scope

The product is for Egyptian secondary-school students. Its intended audience is
normally above the under-13 threshold used in YouTube's child-directed API
policy. The application does not offer YouTube upload, comment, playlist, or
other write actions; it embeds only administrator-selected lesson videos.

On that basis, the current web application is operated as a **non-child-
directed API client**. This decision must be re-confirmed before public launch
by the product owner against the actual target-age policy and applicable
Egyptian/privacy requirements. If the product is changed to target children
under the relevant legal age, the owner must notify Google that it is child
directed before using embeds and obtain legal advice; this is an external
account/compliance action, not something the code can perform.

## Technical controls in the application

- The player uses YouTube Privacy Enhanced Mode (`youtube-nocookie.com`).
- The documented IFrame Player API receives the page origin and reports
  removed/private (`100`), embedding-disabled (`101`/`150`), and referer
  (`153`) errors in a student-readable fallback.
- The player is click-to-play; the app does not autoplay lesson videos.
- Authors must use public, embeddable, non-age-restricted lesson videos and
  check playback in the production domain before publishing.

## Launch checklist

- Confirm the documented age/audience decision still reflects the live
  product. Escalate to legal/privacy review if it does not.
- Keep the platform privacy policy accurate about the third-party YouTube
  embed and links to YouTube.
- Verify the production site sends a normal HTTP Referer by playing a video;
  YouTube reports error `153` if the required client identity is absent.
- Verify every published video is public, embedding-enabled, and not
  age-restricted. Age-restricted videos are not playable on most third-party
  sites.

## Primary references

- [YouTube Help: Embed videos & playlists](https://support.google.com/youtube/answer/171780)
- [YouTube IFrame Player API reference](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)
