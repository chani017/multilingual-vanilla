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
    ar: "[\\u0600-\\u06ff\\u0750-\\u077f\\ufb50-\\ufc3f\\ufe70-\\ufefc]+",
    num: "[0-9]+",
    punct: "[（）().#\\^\\\\\\-&,;:<>“”‘’/@%*，、。」]+"
  };

  var DEFAULT_SKIP_SELECTOR =
    "script, style, textarea, input, select, option, code, pre, [data-ml-ignore]";

  function MultiLingual(params) {
    params = params || {};

    this.containers = normalizeContainers(params.containers || params.container || []);
    this.configuration = getConfiguration(params);
    this.prefix = params.prefix || "ml-";
    this.contextualJapaneseHan = params.contextualJapaneseHan !== false;
    this.skipSelector = params.skipSelector || DEFAULT_SKIP_SELECTOR;
    this.processedAttribute = params.processedAttribute || "data-ml-processed";
    this.processedClass = params.processedClass || "ml-processed";
    this.autoInit = params.autoInit !== false;

    this.rules = this.normalizeConfiguration(this.configuration);
    this.finalRegex = this.composeRegex(this.rules);

    if (this.autoInit) {
      this.init();
    }
  }

  MultiLingual.presets = PRESETS;
  MultiLingual.autoConfiguration = getAutoConfiguration;
  MultiLingual.skipSelector = DEFAULT_SKIP_SELECTOR;

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
    if (
      this.contextualJapaneseHan &&
      className === this.prefix + "cn" &&
      textNode &&
      isJapaneseContext(textNode.parentElement)
    ) {
      return this.prefix + "jp";
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

    if (Object.prototype.hasOwnProperty.call(params, "configuration")) {
      configuration = params.configuration;
    } else if (Object.prototype.hasOwnProperty.call(params, "config")) {
      configuration = params.config;
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

  function isJapaneseContext(element) {
    var current = element;

    while (current && current.nodeType === 1) {
      var lang = current.getAttribute && current.getAttribute("lang");
      if (lang) {
        return /^(ja|jp)(-|$)/i.test(lang);
      }

      current = current.parentElement;
    }

    return false;
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

  function getPunctuationRule(params) {
    var value;

    if (Object.prototype.hasOwnProperty.call(params, "punctuation")) {
      value = params.punctuation;
    } else if (Object.prototype.hasOwnProperty.call(params, "punct")) {
      value = params.punct;
    } else if (params.includePunctuation === true) {
      value = true;
    }

    if (!value) return null;
    if (value === true) return "punct";

    if (typeof value === "string") {
      return {
        key: "punct",
        className: params.punctuationClass || (params.prefix || "ml-") + "punct",
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
