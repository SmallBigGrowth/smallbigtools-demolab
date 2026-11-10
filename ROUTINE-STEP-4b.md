# Step to add to the "Smallbigtools weekly research" routine

In claude.ai, open the routine, and paste this between steps 4 and 5:

```
4b. Also save the same report to Google Drive with the Google_Drive connector: a Markdown file named "Smallbigtools research YYYY-MM-DD.md" in the Drive folder "Smallbigtools research" (create the folder if it does not exist). End this copy with a heading "## reel_queue" followed by one fenced json code block holding a valid JSON array with one object per approved tool, in posting order, with: name, maker, official_url, platforms, demo_source (one of web_no_login, windows_app, mac_app, iphone_app, android_app, chrome_extension, needs_account), app_store_id (number if it is on the Apple App Store, else null), hook, keyword (one word in capitals for "comment WORD and I'll DM you the link"), facts (3 or 4 [label, value] pairs, each verified on an official page this week), catch (the main limit or paid tier), sources (URLs). Only facts the manager verified. A separate reel builder reads this block every Monday to make the Reels.
```

The routine already has the Google Drive connector. The previous prompt is saved in `research/data/smallbigtools-routine-prompt-before-2026-11-10.txt` (in the Social media Posting folder).
