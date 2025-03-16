console.log("AI Sanitizer content script loaded (Firefox compatibility)");

function setupSanitization() {
    let isEnabled = true;
    let regexRules = [];

    function sanitizeText(text) {
        if (!text) return text;
        
        let normalizedText = text.replace(/[\r\n]+/g, ' ');
        let previousText = '';
        let sanitized = normalizedText;

        while (sanitized !== previousText) {
            previousText = sanitized;
            regexRules.forEach(rule => {
                sanitized = sanitized.replace(rule.pattern, rule.token);
            });
        }
        return sanitized;
    }

    function getFullText(element) {
        let text = '';
        
        if (element.nodeType === Node.TEXT_NODE) {
            text += element.textContent.trim();
        } else if (element.nodeType === Node.ELEMENT_NODE && element.tagName === 'BR') {
            text += ' ';
        } else if (element.nodeType === Node.ELEMENT_NODE) {
            element.childNodes.forEach(child => {
                const childText = getFullText(child);
                if (childText) {
                    text += childText + ' ';
                }
            });
        }
        console.log("Extracted text segment (Firefox):", text);
        return text.trim();
    }

    function setFullText(element, sanitizedText) {
        const segments = sanitizedText.split(/\s+/).filter(segment => segment.length > 0);
        let segmentIndex = 0;

        function updateNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (segmentIndex < segments.length) {
                    node.textContent = segments[segmentIndex];
                    segmentIndex++;
                } else {
                    node.textContent = '';
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
                node.childNodes.forEach(child => {
                    if (segmentIndex < segments.length) {
                        updateNode(child);
                    } else {
                        if (child.nodeType === Node.TEXT_NODE) {
                            child.textContent = '';
                        }
                    }
                });
                if (segmentIndex < segments.length && node.tagName === 'DIV') {
                    while (segmentIndex < segments.length) {
                        const p = document.createElement('p');
                        p.textContent = segments[segmentIndex];
                        node.appendChild(p);
                        segmentIndex++;
                    }
                }
            }
        }

        updateNode(element);
        element.querySelectorAll('p').forEach(p => {
            if (!p.textContent.trim() && !p.querySelector('br')) {
                p.remove();
            }
        });
        console.log("Set sanitized text to DOM (Firefox):", sanitizedText);
    }

    // Use browser namespace with chrome fallback for cross-browser compatibility
    const browserApi = typeof browser !== 'undefined' ? browser : chrome;

    browserApi.storage.local.get(["sanitizationEnabled", "sanitize_rules"], (data) => {
        isEnabled = data.sanitizationEnabled !== undefined ? data.sanitizationEnabled : true;
        const allRules = data.sanitize_rules || [];
        regexRules = allRules.map(rule => ({
            pattern: new RegExp(rule.regex, "g"),
            token: rule.token
        }));
        console.log("Sanitization enabled state (Firefox):", isEnabled);
        console.log("Sanitize rules loaded (Firefox):", allRules);

        if (!isEnabled) {
            console.log("Sanitization disabled by user (Firefox)");
            return;
        }

        if (!allRules.length) {
            console.log("No sanitize rules defined (Firefox)");
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                const chatGptInput = document.querySelector("#prompt-textarea") ||
                                    document.querySelector("div.textarea") ||
                                    document.querySelector("textarea[placeholder*='Message']");
                if (chatGptInput && !chatGptInput.dataset.sanitized) {
                    console.log("ChatGPT input found (Firefox):", chatGptInput);
                    chatGptInput.dataset.sanitized = "true";
                    if (chatGptInput.getAttribute("contenteditable") === "true") {
                        setupContentEditableObserver(chatGptInput);
                    } else if (chatGptInput.tagName === "TEXTAREA") {
                        setupInputListener(chatGptInput);
                    }
                }

                const grokInput = document.querySelector("textarea.w-full");
                if (grokInput && !grokInput.dataset.sanitized) {
                    console.log("Grok input found (Firefox):", grokInput);
                    grokInput.dataset.sanitized = "true";
                    setupInputListener(grokInput);
                }

                const claudeInput = document.querySelector("div[contenteditable='true']") || 
                                   document.querySelector("div.ProseMirror") || 
                                   document.querySelector("#prompt-text-input");
                if (claudeInput && !claudeInput.dataset.sanitized && window.location.href.includes("claude.ai")) {
                    console.log("Claude input found (Firefox):", claudeInput);
                    claudeInput.dataset.sanitized = "true";
                    setupContentEditableObserver(claudeInput);
                }

                const geminiInput = document.querySelector("div.ql-editor");
                if (geminiInput && !geminiInput.dataset.sanitized) {
                    console.log("Gemini input found (Firefox):", geminiInput);
                    geminiInput.dataset.sanitized = "true";
                    const setupGeminiObserver = () => {
                        if (geminiInput.getAttribute("contenteditable") === "true") {
                            setupContentEditableObserver(geminiInput);
                        } else {
                            console.log("Gemini input not ready, retrying (Firefox)...");
                            setTimeout(setupGeminiObserver, 500);
                        }
                    };
                    setupGeminiObserver();
                }

                const githubCopilotInput = document.querySelector("#copilot-chat-textarea");
                if (githubCopilotInput && !githubCopilotInput.dataset.sanitized) {
                    console.log("GitHub Copilot input found (Firefox):", githubCopilotInput);
                    githubCopilotInput.dataset.sanitized = "true";
                    setupInputListener(githubCopilotInput);
                }

                const perplexityInput = document.querySelector("textarea[placeholder='Ask follow-up']");
                if (perplexityInput && !perplexityInput.dataset.sanitized) {
                    console.log("Perplexity input found (Firefox):", perplexityInput);
                    perplexityInput.dataset.sanitized = "true";
                    setupInputListener(perplexityInput);
                }

                const msCopilotInput = document.querySelector("#userInput");
                if (msCopilotInput && !msCopilotInput.dataset.sanitized) {
                    console.log("Microsoft Copilot input found (Firefox):", msCopilotInput);
                    msCopilotInput.dataset.sanitized = "true";
                    setupInputListener(msCopilotInput);
                }

                const bingCopilotInput = document.querySelector("#uaseabox");
                if (bingCopilotInput && !bingCopilotInput.dataset.sanitized && window.location.href.includes("bing.com")) {
                    console.log("Bing Copilot input found (Firefox):", bingCopilotInput);
                    bingCopilotInput.dataset.sanitized = "true";
                    setupInputListener(bingCopilotInput);
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        function setupInputListener(inputField) {
            if (inputField.tagName !== "TEXTAREA" && inputField.tagName !== "INPUT") {
                console.warn("setupInputListener called on non-textarea/input element (Firefox):", inputField);
                return;
            }
            console.log("Setting up listener for input/textarea (Firefox):", inputField);

            const sanitizeInput = (originalText) => {
                console.log("Original text before sanitization (Firefox):", originalText);
                const sanitizedText = sanitizeText(originalText);
                console.log("Sanitized text after first pass (Firefox):", sanitizedText);
                if (sanitizedText !== originalText) {
                    console.log("Input/textarea input detected (Firefox):", originalText);
                    inputField.value = sanitizedText;
                    console.log("Sanitized text set (Firefox):", sanitizedText);
                    setTimeout(() => {
                        const recheckText = inputField.value;
                        console.log("Recheck text (Firefox):", recheckText);
                        const recheckSanitized = sanitizeText(recheckText);
                        console.log("Recheck sanitized text (Firefox):", recheckSanitized);
                        if (recheckSanitized !== recheckText) {
                            console.log("Input/textarea recheck detected (Firefox):", recheckText);
                            inputField.value = recheckSanitized;
                            console.log("Recheck sanitized text set (Firefox):", recheckSanitized);
                            const inputEvent = new Event('input', { bubbles: true });
                            inputField.dispatchEvent(inputEvent);
                        }
                    }, 0);
                }
            };

            inputField.addEventListener("input", (e) => {
                const originalText = e.target.value;
                sanitizeInput(originalText);
            });

            inputField.addEventListener("keyup", (e) => {
                const originalText = e.target.value;
                sanitizeInput(originalText);
            });

            const originalText = inputField.value;
            if (originalText) {
                const sanitizedText = sanitizeText(originalText);
                if (sanitizedText !== originalText) {
                    console.log("Initial sanitization for input/textarea (Firefox):", sanitizedText);
                    inputField.value = sanitizedText;
                }
            }
        }

        function setupContentEditableObserver(inputField) {
            if (inputField.tagName === "TEXTAREA") {
                console.warn("setupContentEditableObserver called on textarea element (Firefox):", inputField);
                return;
            }
            let lastSanitizedText = '';

            function debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }

            const sanitizeContent = debounce(() => {
                let originalText = '';
                try {
                    originalText = getFullText(inputField);
                    console.log("Original text extracted from contenteditable (Firefox):", originalText);
                } catch (e) {
                    console.warn("Error accessing text content (Firefox):", e);
                    return;
                }
                const sanitizedText = sanitizeText(originalText);
                console.log("Sanitized text after first pass (Firefox):", sanitizedText);
                if (sanitizedText !== originalText && sanitizedText !== lastSanitizedText) {
                    console.log("Contenteditable input detected (Firefox):", originalText);
                    try {
                        setFullText(inputField, sanitizedText);
                        lastSanitizedText = sanitizedText;
                        console.log("Sanitized text set (Firefox):", sanitizedText);
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.selectNodeContents(inputField);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        setTimeout(() => {
                            const recheckText = getFullText(inputField);
                            console.log("Recheck text (Firefox):", recheckText);
                            const recheckSanitized = sanitizeText(recheckText);
                            console.log("Recheck sanitized text (Firefox):", recheckSanitized);
                            if (recheckSanitized !== recheckText) {
                                console.log("Contenteditable recheck detected (Firefox):", recheckText);
                                setFullText(inputField, recheckSanitized);
                                lastSanitizedText = recheckSanitized;
                                console.log("Recheck sanitized text set (Firefox):", recheckSanitized);
                            }
                        }, 0);
                    } catch (e) {
                        console.error("Error sanitizing contenteditable (Firefox):", e);
                    }
                }
            }, 100);

            const contentObserver = new MutationObserver(() => {
                sanitizeContent();
            });

            contentObserver.observe(inputField, { childList: true, subtree: true, characterData: true });

            if (inputField.textContent || inputField.innerText) {
                let originalText = '';
                try {
                    originalText = getFullText(inputField);
                } catch (e) {
                    console.warn("Error accessing initial text content (Firefox):", e);
                    return;
                }
                const sanitizedText = sanitizeText(originalText);
                if (sanitizedText !== originalText) {
                    console.log("Initial sanitization for contenteditable (Firefox):", sanitizedText);
                    try {
                        setFullText(inputField, sanitizedText);
                        lastSanitizedText = sanitizedText;
                    } catch (e) {
                        console.error("Error sanitizing initial contenteditable (Firefox):", e);
                    }
                }
            }
        }
    });
}

setupSanitization();