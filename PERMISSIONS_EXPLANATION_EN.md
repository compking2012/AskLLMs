# Chrome Web Store Permissions Justification (English)

## Product Feature Description

### Product Purpose

This extension is an efficiency tool designed specifically for AI users, aiming to solve the tedious problem of sending the same query to multiple AI platforms simultaneously. In today's era of rapid AI technology development, users often need to compare responses from different AI models to obtain more comprehensive and accurate information. However, the traditional approach requires users to manually open multiple browser tabs, visit different AI platforms one by one, and repeatedly input the same query content, which is not only time-consuming and laborious but also error-prone.

This extension implements the core functionality of "one-click multi-platform query" through automation technology. Users only need to click the extension icon or use a keyboard shortcut (Ctrl+Shift+Y) on any webpage to pop up a clean and beautiful input interface. After users input their query content and select the AI platforms they want to use, the extension will automatically complete the following operations: create new tabs for each selected platform, open the corresponding AI websites, automatically input the query content, and automatically click the send button. The entire process is fully automated, requiring no manual operation from users.

More importantly, the extension automatically organizes all opened AI platform tabs into a tab group, with clear titles and color identifiers, allowing users to easily manage and compare responses from different AIs. This design greatly improves user efficiency, especially suitable for the following scenarios:

**Academic Research and Learning**: Students and researchers need to compare how different AI models understand and respond to the same question to gain more comprehensive knowledge perspectives. For example, when writing papers, they can simultaneously query multiple AI platforms about definitions, application scenarios, and latest research progress of related concepts, gaining deeper understanding by comparing responses from different models.

**Content Creation and Writing**: Content creators, writers, and editors need to obtain creative inspiration, writing suggestions, and content optimization solutions from multiple AI platforms. By querying multiple platforms simultaneously, they can quickly collect diverse viewpoints and suggestions, choose the most suitable solution for their needs, and improve creation quality and efficiency.

**Programming and Technical Development**: Programmers and technical personnel need to compare different AI models' suggestions on code issues, technical solutions, and best practices. By querying multiple platforms simultaneously, they can obtain more comprehensive technical perspectives, discover potential problems and optimization opportunities, and improve code quality and development efficiency.

**Business Decision-Making and Consulting**: Enterprise users and consultants need to analyze problems from multiple angles to obtain more comprehensive business insights. By querying multiple AI platforms simultaneously, they can quickly collect diverse viewpoints and suggestions, providing more comprehensive reference for decision-making.

**Language Learning and Translation**: Language learners need to compare different AI models' translations, explanations, and language learning suggestions for the same text. By querying multiple platforms simultaneously, they can obtain more accurate and comprehensive language learning resources.

**Daily Information Queries**: When ordinary users encounter problems in daily life, querying multiple AI platforms simultaneously can provide more comprehensive and accurate information, avoiding biases or errors that may exist in a single source.

### Why Users Should Install

**1. Significantly Improve Work Efficiency**

In the traditional approach, users need to manually open 3-5 AI platform tabs and input the same query content one by one, which may take 2-3 minutes. With this extension, the entire process takes only 10-20 seconds, improving efficiency by more than 10 times. For users who frequently need to compare AI responses, this efficiency improvement is enormous.

**2. Reduce Operational Errors**

Manual operations are prone to input errors, missing platforms, or forgetting certain query content. This extension ensures that each query is accurately and completely sent to all selected platforms through automation technology, avoiding human errors.

**3. Intelligent Tab Management**

The extension automatically organizes all AI platform tabs into a tab group with clear titles and color identifiers. Users can easily find and manage all related tabs without getting lost among numerous tabs. This intelligent management feature is particularly suitable for users who need to handle multiple query tasks simultaneously.

**4. Flexible Platform Selection**

Users can flexibly choose which AI platforms to use according to their needs. The extension remembers user preferences and automatically restores them on next use, eliminating the need for repeated selection. This personalized design allows users to customize the most suitable query solution according to their usage habits and needs.

**5. Complete Privacy Protection**

This extension runs entirely on the user's local device and does not collect, store, or upload any user data. All user information, including query content and platform selections, is stored only locally and never uploaded to any server. This privacy protection design allows users to use the extension with confidence without worrying about data leaks or privacy issues.

**6. Cross-Page Usage**

The extension supports use on any webpage, including special pages (such as chrome:// and about:blank). Users can quickly initiate queries on any page without opening specific AI platform websites, greatly improving user experience through this convenience.

**7. Free and Open Source**

This extension is completely free, and users can use all features without restrictions. At the same time, the extension's code logic is completely transparent, allowing users to review all functions to ensure the extension's behavior meets expectations and does not perform any malicious operations.

**8. Continuous Updates and Maintenance**

The extension will be continuously updated to support more AI platforms, optimize user experience, and fix potential issues. Users can receive continuous technical support and feature updates, ensuring the extension always meets user needs.

### Summary

This extension provides AI users with an efficient, convenient, and secure query tool through automation technology and intelligent management features. Whether for academic research, content creation, programming development, or daily information queries, this extension can significantly improve user work efficiency, reduce operational errors, and provide a better user experience. At the same time, the extension completely protects user privacy and does not collect any data, allowing users to use it with confidence. If you frequently need to compare responses from different AI models or want to improve the efficiency of AI queries, this extension will be your ideal choice.

---

## 1. Single Purpose Statement

The extension has a single, specific purpose: to enable users to send the same query to multiple AI platforms with one click, and automatically organize the opened tabs into a tab group for easy comparison of different AI model responses. The extension automatically inputs the query content and clicks the send button on the user-selected AI platform web pages. It does not collect, store, or upload any user data. All operations are performed locally on the user's device.

---

## 2. `tabs` Permission Justification

The extension requires the `tabs` permission to implement its core functionality: sending queries to multiple AI platforms simultaneously. Specific uses include: (1) Creating new tabs: Create new tabs for each AI platform selected by the user and open the corresponding AI websites; (2) Checking existing tabs: Query whether tabs for the same platform already exist in the browser to avoid duplicate openings; (3) Organizing tabs: Automatically group all AI platform tabs opened for the same query to facilitate user management and comparison; (4) Getting current tab: When the user clicks the extension icon or uses a keyboard shortcut, get the currently active tab to inject the input interface. The extension is only used to manage AI platform-related tabs and does not access or modify the content of other tabs.

---

## 3. `scripting` Permission Justification

The extension requires the `scripting` permission to inject content scripts into AI platform web pages to implement automatic query input and sending functionality. Specific uses include: (1) Automatic query input: Automatically input user query content into the input fields of target AI pages; (2) Automatic sending: Automatically click the send button or simulate the Enter key to trigger AI responses; (3) Platform adaptation: Each AI platform uses different editors (ProseMirror, Quill, Lexical, contenteditable div, textarea), requiring targeted script injection to locate the correct input fields and send buttons. The extension only executes scripts on AI platform web pages explicitly selected by the user, only accesses necessary DOM elements (input fields, send buttons), and does not access any user data or other page content.

---

## 4. `activeTab` Permission Justification

The extension requires the `activeTab` permission to inject a floating input interface into the user's currently active tab. Specific uses include: (1) Popup input window: When the user clicks the extension icon or uses a keyboard shortcut (Ctrl+Shift+Y), display a query input box and platform selection interface on any page the user is currently browsing; (2) Support for special pages: Allow the extension to be used on special pages such as `chrome://` and `about:blank`; (3) User interaction: Users can input queries in the input box, select AI platforms to use, and then send to all selected platforms with one click. The extension only accesses the current tab when the user actively triggers it (clicking the icon or using a keyboard shortcut), only injects UI elements, and does not read or modify page content.

---

## 5. `storage` Permission Justification

The extension requires the `storage` permission to save the user's selected AI platform preferences so they can be automatically restored on next use. Specific uses include: (1) Saving user preferences: Record which AI platforms the user chooses to use; (2) Cross-session persistence: When the user closes and reopens the browser, previous platform selections are retained without needing to reselect; (3) Cross-context synchronization: Share the same platform selection state between the popup window and the injected UI. The extension only stores the names of platforms selected by the user (an array of strings), does not store any personally identifiable information, query content, or other sensitive data. Data is only stored locally on the user's device (chrome.storage.local), is not uploaded to any server, and all data is automatically cleared when the user uninstalls the extension.

---

## 6. `tabGroups` Permission Justification

The extension requires the `tabGroups` permission to automatically organize all AI platform tabs opened for the same query into a tab group, facilitating user management and comparison of different AI responses. Specific uses include: (1) Automatic tab group creation: When the user sends queries to multiple AI platforms, automatically group all opened tabs; (2) Setting tab group title: Name the tab group "大模型" (Chinese) or "AI Models" (English) for easy identification; (3) Random color assignment: Randomly select a color (grey, blue, red, yellow, green, pink, purple, cyan) each time a tab group is created to help distinguish different query sessions; (4) Reusing existing groups: If a "大模型" tab group already exists, add new tabs to the existing group to avoid creating duplicate groups. The extension only manages tab groups it creates, does not access or modify other user-created tab groups, and does not collect, store, or upload any tab group-related data.

---

## 7. Host Permissions Justification

The extension requires host permissions to access multiple major AI platform websites to implement its core functionality: injecting content scripts into user-selected AI platform web pages, automatically locating input fields, inputting user query content, and clicking send buttons to enable sending the same query to multiple AI platforms simultaneously with one click. These platforms include multiple mainstream AI model service websites from different regions. Each platform uses different editor types (ProseMirror, Quill, Lexical, contenteditable div, textarea), and the extension needs to access DOM elements to locate input fields and send buttons. The extension only accesses necessary DOM elements (input fields and send buttons), does not read, store, or upload any page data, and only accesses AI platforms explicitly selected by users.

