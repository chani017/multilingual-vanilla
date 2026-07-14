/*!
 * multilingual-vanilla
 * A dependency-free version of multilingual.js for multilingual web typography.
 * Inspired by https://github.com/multilingualjs/multilingual.js
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    root.MultiLingual = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRESETS = {
    en: "[A-Za-z]+",
    ko: "[ㄱ-ㅎ가-힣ㅏ-ㅣ]+",
    jp: "[\\u3040-\\u309F\\u30A0-\\u30FF]+",
    cn: "[\\u4E00-\\u9FBF]+",
    ar: "[\\u0620-\\u065F\\u066E-\\u06D3\\u06D5-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFC3F\\uFE70-\\uFEFC]+",
    num: "[0-9]+",
    punct: "[（）().#\\^\\\\\\-&,;:<>“”‘’/@%*，、。」]+"
  };

  var DEFAULT_SKIP_SELECTOR =
    "script, style, textarea, input, select, option, code, pre, [data-ml-ignore]";

  var LANGUAGE_CONTEXT_SELECTOR =
    "p, li, dt, dd, blockquote, figcaption, caption, th, td, h1, h2, h3, h4, h5, h6, " +
    "address, article, aside, div, footer, header, main, nav, section, figure, details, " +
    "summary, dialog, form, fieldset, legend, button, label";

  function MultiLingual(params) {
    params = params || {};

    this.containers = normalizeContainers(params.container || params.containers || []);
    this.configuration = getConfiguration(params);
    this.prefix = params.prefix || "ml-";
    this.contextualJapaneseHan =
      getOption(params, "contextJpHan", "contextualJapaneseHan", true) !== false;
    this.contextualPunctuation =
      getOption(params, "contextPunct", "contextualPunctuation", true) !== false;
    this.languageContextSelector =
      getOption(params, "langContextSel", "languageContextSelector", LANGUAGE_CONTEXT_SELECTOR) ||
      LANGUAGE_CONTEXT_SELECTOR;
    this.skipSelector =
      getOption(params, "skipSel", "skipSelector", DEFAULT_SKIP_SELECTOR) ||
      DEFAULT_SKIP_SELECTOR;
    this.processedAttribute =
      getOption(params, "processedAttr", "processedAttribute", "data-ml-processed") ||
      "data-ml-processed";
    this.processedClass = params.processedClass || "ml-processed";
    this.autoInit = params.autoInit !== false;

    this.rules = this.normalizeConfiguration(this.configuration);
    this.punctuationClass = getRuleClassName(this.rules, "punct") || this.prefix + "punct";
    this.finalRegex = this.composeRegex(this.rules);

    if (this.autoInit) {
      this.init();
    }
  }

  MultiLingual.presets = PRESETS;
  MultiLingual.autoConfiguration = getAutoConfiguration;
  MultiLingual.skipSelector = DEFAULT_SKIP_SELECTOR;
  MultiLingual.languageContextSelector = LANGUAGE_CONTEXT_SELECTOR;
  MultiLingual.skipSel = DEFAULT_SKIP_SELECTOR;
  MultiLingual.langContextSel = LANGUAGE_CONTEXT_SELECTOR;

  MultiLingual.run = function (containers, configuration, options) {
    if (configuration === null) {
      configuration = undefined;
    }

    if (isOptionsObject(configuration)) {
      options = configuration;
      configuration = undefined;
    }

    options = options || {};
    options.containers = containers;
    if (configuration !== undefined) {
      options.configuration = configuration;
    }
    return new MultiLingual(options);
  };

  MultiLingual.prototype.init = function () {
    for (var i = 0; i < this.containers.length; i += 1) {
      this.process(this.containers[i]);
    }

    return this;
  };

  MultiLingual.prototype.process = function (container) {
    if (!container || !this.rules.length) return this;

    var textNodes = collectTextNodes(container, this.skipSelector, this.processedAttribute);

    for (var i = 0; i < textNodes.length; i += 1) {
      this.replaceTextNode(textNodes[i]);
    }

    return this;
  };

  MultiLingual.prototype.replaceTextNode = function (textNode) {
    var text = textNode.nodeValue;
    if (!text || !this.finalRegex.test(text)) {
      this.finalRegex.lastIndex = 0;
      return;
    }

    this.finalRegex.lastIndex = 0;

    var fragment = document.createDocumentFragment();
    var lastIndex = 0;
    var match;

    while ((match = this.finalRegex.exec(text)) !== null) {
      var value = match[0];
      var index = match.index;

      if (index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
      }

      var className = this.resolveClassName(value, this.getClassNameFromMatch(match), textNode);
      fragment.appendChild(this.createWrappedNode(value, className));
      lastIndex = index + value.length;

      if (value.length === 0) {
        this.finalRegex.lastIndex += 1;
      }
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode.replaceChild(fragment, textNode);
  };

  MultiLingual.prototype.createWrappedNode = function (text, className) {
    var span = document.createElement("span");
    span.className = className;
    span.setAttribute(this.processedAttribute, "");
    span.textContent = text;
    return span;
  };

  MultiLingual.prototype.getClassNameFromMatch = function (match) {
    for (var i = 1; i < match.length; i += 1) {
      if (match[i] !== undefined) {
        return this.rules[i - 1].className;
      }
    }

    return "";
  };

  MultiLingual.prototype.resolveClassName = function (text, className, textNode) {
    var parent = textNode && textNode.parentElement;

    if (
      this.contextualJapaneseHan &&
      className === this.prefix + "cn" &&
      parent &&
      isJapaneseContext(parent, this.prefix, this.languageContextSelector)
    ) {
      return this.prefix + "jp";
    }

    if (
      this.contextualPunctuation &&
      className === this.punctuationClass &&
      parent
    ) {
      var contextualClassName = getResolvedContextClassName(
        parent,
        this.prefix,
        this.languageContextSelector
      );
      if (contextualClassName && contextualClassName !== className) {
        return className + " " + contextualClassName;
      }
    }

    return className;
  };

  MultiLingual.prototype.normalizeConfiguration = function (configuration) {
    if (!Array.isArray(configuration)) {
      throw new TypeError("MultiLingual configuration must be an array.");
    }

    var rules = [];

    for (var i = 0; i < configuration.length; i += 1) {
      var config = configuration[i];

      if (typeof config === "string") {
        if (!PRESETS[config]) {
          throw new Error("Unknown MultiLingual preset: " + config);
        }

        rules.push({
          key: config,
          className: this.prefix + config,
          pattern: PRESETS[config]
        });
      } else if (config && typeof config === "object") {
        if (!config.className) {
          throw new Error("Custom MultiLingual rules need a className.");
        }

        if (!config.charset && !config.regex) {
          throw new Error("Custom MultiLingual rules need charset or regex.");
        }

        rules.push({
          key: config.key || config.className,
          className: config.className,
          pattern: config.regex || computeCustomRegex(config.charset)
        });
      }
    }

    return rules;
  };

  MultiLingual.prototype.composeRegex = function (rules) {
    var parts = [];

    for (var i = 0; i < rules.length; i += 1) {
      parts.push("(" + rules[i].pattern + ")");
    }

    return new RegExp(parts.join("|"), "g");
  };

  MultiLingual.prototype.unwrap = function () {
    for (var i = 0; i < this.containers.length; i += 1) {
      unwrapContainer(this.containers[i], this.processedAttribute);
    }

    return this;
  };

  function normalizeContainers(containers) {
    if (typeof containers === "string") {
      return Array.prototype.slice.call(document.querySelectorAll(containers));
    }

    if (containers && containers.nodeType) {
      return [containers];
    }

    if (containers && typeof containers.length === "number") {
      return Array.prototype.slice.call(containers);
    }

    return [];
  }

  function getAutoConfiguration() {
    return Object.keys(PRESETS).filter(function (key) {
      return key !== "punct";
    });
  }

  function getConfiguration(params) {
    var configuration;

    if (Object.prototype.hasOwnProperty.call(params, "config")) {
      configuration = params.config;
    } else if (Object.prototype.hasOwnProperty.call(params, "configuration")) {
      configuration = params.configuration;
    } else {
      configuration = getAutoConfiguration();
    }

    configuration = Array.isArray(configuration) ? configuration.slice() : configuration;

    var punctuationRule = getPunctuationRule(params);
    if (punctuationRule && Array.isArray(configuration) && !hasPunctuationRule(configuration)) {
      configuration.push(punctuationRule);
    }

    return configuration;
  }

  function collectTextNodes(container, skipSelector, processedAttribute) {
    var nodes = [];
    var walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          var parent = node.parentElement;
          if (!parent) {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.hasAttribute(processedAttribute)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (matches(parent, skipSelector)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.closest && parent.closest(skipSelector)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    var current;
    while ((current = walker.nextNode())) {
      nodes.push(current);
    }

    return nodes;
  }

  function unwrapContainer(container, processedAttribute) {
    var wrapped = container.querySelectorAll("span[" + processedAttribute + "]");

    for (var i = wrapped.length - 1; i >= 0; i -= 1) {
      var span = wrapped[i];
      var text = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(text, span);
    }

    container.normalize();
  }

  function isJapaneseContext(element, prefix, contextSelector) {
    return getResolvedContextClassName(element, prefix, contextSelector) === prefix + "jp";
  }

  function getResolvedContextClassName(element, prefix, contextSelector) {
    var contextElement = getLanguageContextElement(element, contextSelector);
    var localLang = getLangWithin(element, contextElement);

    if (localLang !== null) {
      return getClassNameFromLang(localLang, prefix);
    }

    var inferredClassName = inferContextClassName(contextElement.textContent, prefix);
    if (inferredClassName) {
      return inferredClassName;
    }

    return getContextualClassName(contextElement.parentElement, prefix);
  }

  function getLanguageContextElement(element, contextSelector) {
    var current = element;

    while (current && current.nodeType === 1) {
      if (matches(current, contextSelector)) {
        return current;
      }

      current = current.parentElement;
    }

    return element;
  }

  function getLangWithin(element, boundary) {
    var current = element;

    while (current && current.nodeType === 1) {
      if (current.hasAttribute && current.hasAttribute("lang")) {
        return current.getAttribute("lang");
      }

      if (current === boundary) {
        break;
      }

      current = current.parentElement;
    }

    return null;
  }

  function inferContextClassName(text, prefix) {
    var value = String(text || "");

    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(value)) return prefix + "jp";
    if (/[ㄱ-ㅎ가-힣ㅏ-ㅣ]/.test(value)) return prefix + "ko";
    if (/[\u0620-\u065F\u066E-\u06D3\u06D5-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFC3F\uFE70-\uFEFC]/.test(value)) {
      return prefix + "ar";
    }
    if (/[\u4E00-\u9FBF]/.test(value)) return prefix + "cn";
    if (/[A-Za-z]/.test(value)) return prefix + "en";

    return "";
  }

  function getContextualClassName(element, prefix) {
    var current = element;

    while (current && current.nodeType === 1) {
      var lang = current.getAttribute && current.getAttribute("lang");
      if (lang) {
        return getClassNameFromLang(lang, prefix);
      }

      current = current.parentElement;
    }

    return "";
  }

  function getClassNameFromLang(lang, prefix) {
    var normalized = String(lang).toLowerCase();

    if (/^ko(-|$)/.test(normalized)) return prefix + "ko";
    if (/^(ja|jp)(-|$)/.test(normalized)) return prefix + "jp";
    if (/^(zh|cn)(-|$)/.test(normalized)) return prefix + "cn";
    if (/^en(-|$)/.test(normalized)) return prefix + "en";
    if (/^ar(-|$)/.test(normalized)) return prefix + "ar";

    return "";
  }

  function getRuleClassName(rules, key) {
    for (var i = 0; i < rules.length; i += 1) {
      if (rules[i].key === key) {
        return rules[i].className;
      }
    }

    return "";
  }

  function matches(element, selector) {
    if (!selector || !element || element.nodeType !== 1) return false;

    var fn =
      element.matches ||
      element.msMatchesSelector ||
      element.webkitMatchesSelector ||
      element.mozMatchesSelector;

    return fn ? fn.call(element, selector) : false;
  }

  function isOptionsObject(value) {
    return !!(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !value.className &&
      !value.charset &&
      !value.regex
    );
  }

  function getOption(params, shortName, longName, fallback) {
    if (Object.prototype.hasOwnProperty.call(params, shortName)) {
      return params[shortName];
    }

    if (Object.prototype.hasOwnProperty.call(params, longName)) {
      return params[longName];
    }

    return fallback;
  }

  function getPunctuationRule(params) {
    var value;
    var customClassName = params.punctClass || params.punctuationClass;

    if (Object.prototype.hasOwnProperty.call(params, "punct")) {
      value = params.punct;
    } else if (Object.prototype.hasOwnProperty.call(params, "punctuation")) {
      value = params.punctuation;
    } else if (params.includePunctuation === true) {
      value = true;
    }

    if (!value) return null;
    if (value === true) {
      if (!customClassName) return "punct";

      return {
        key: "punct",
        className: customClassName,
        regex: PRESETS.punct
      };
    }

    if (typeof value === "string") {
      return {
        key: "punct",
        className: customClassName || (params.prefix || "ml-") + "punct",
        charset: value
      };
    }

    if (value && typeof value === "object") {
      return value;
    }

    return null;
  }

  function hasPunctuationRule(configuration) {
    for (var i = 0; i < configuration.length; i += 1) {
      var rule = configuration[i];
      if (rule === "punct") return true;
      if (rule && typeof rule === "object" && (rule.key === "punct" || rule.className === "ml-punct")) {
        return true;
      }
    }

    return false;
  }


  function computeCustomRegex(charset) {
    return "[" + escapeRegexStr(String(charset)) + "]+";
  }

  function escapeRegexStr(str) {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
  }

  MultiLingual.escapeRegexStr = escapeRegexStr;
  MultiLingual.computeCustomRegex = computeCustomRegex;

  return MultiLingual;
});
