# multilingual-vanilla

`multilingual-vanilla`는 [multilingual.js](https://github.com/multilingualjs/multilingual.js)의 다국어 섞어짜기를 jQuery 없이 사용할 수 있도록 만든 바닐라 JavaScript 버전입니다.
모든 동작 원리는 위 라이브러리에 기반하고 있음을 밝힙니다.

원본 라이브러리처럼 특정 문자셋을 찾아 `<span>`으로 감싸고, `ml-ko`, `ml-en`, `ml-num` 같은 클래스를 부여합니다. 차이는 DOM 텍스트 노드만 직접 처리한다는 점입니다. 그래서 `innerHTML` 문자열 치환보다 안전하고, 이미 처리된 span을 다시 감싸지 않으며, `script/style/pre/code` 영역은 기본적으로 건너뜁니다.

## 사용법

```html
<script src="https://cdn.jsdelivr.net/npm/multilingual-vanilla/dist/multilingual-vanilla.js"></script>
<script>
	document.addEventListener("DOMContentLoaded", function () {
		MultiLingual.run("body");
	});
</script>
```

CSS 파일은 필요 없습니다. 이 라이브러리는 텍스트를 `<span class="ml-ko">`, `<span class="ml-en">`처럼 감싸기만 하고, 폰트/자간/색상/baseline은 바꾸지 않습니다. 필요한 타이포그래피 보정은 프로젝트 CSS에서 직접 작성하면 됩니다.

또는 원본 npm API와 비슷하게 쓸 수 있습니다.

```js
new MultiLingual({
	container: document.body,
});
```

설정을 생략하면 `PRESETS`에 등록된 기본 문자셋 중 문장부호를 제외한 문자셋이 자동으로 적용됩니다. 한글이 있으면 `.ml-ko`, 영문이 있으면 `.ml-en`, 숫자가 있으면 `.ml-num`처럼 대응하는 class로 감싸집니다. 문장부호는 CJK 금칙 줄바꿈을 방해할 수 있어 자동 적용에서 제외됩니다. 필요한 경우 `punctuation` 옵션으로 원하는 문장부호만 추가할 수 있습니다.

또한 `lang="ja"` 또는 `lang="jp"` 문맥 안의 한자는 기본적으로 `.ml-jp`로 처리됩니다. 일본어 문장 안의 한자가 중국어 폰트 규칙인 `.ml-cn`을 타지 않게 하기 위한 보정입니다. 이 동작을 끄려면 `contextualJapaneseHan: false`를 넘기면 됩니다.

```js
MultiLingual.run("body", {
	punctuation: "?!(),.，。、；;：“”‘’「」『』（）-_",
});
```

특정 문자셋만 쓰고 싶으면 배열로 명시하면 됩니다.

```js
MultiLingual.run("body", ["en", "num"]);
```

특정 클래스에 적용하고 싶다면 body 대신 해당 클래스 명으로 교체하여 사용하면 됩니다.

```js
MultiLingual.run(".text-content");
```

## 처리 예시

원본:

```html
<p>
	섞어짜기란 Korean과 Latin alphabet의 서로 다른 height, weight, rhythm을 조율해
	하나의 sentence 안에서 자연스러운 balance와 flow를 만드는 typography 방식이다.
</p>
```

처리 후:

```html
<p>
	<span class="ml-ko">섞어짜기란</span>
	<span class="ml-en">Korean</span>
	<span class="ml-ko">과</span>
	<span class="ml-en">Latin</span>
	<span class="ml-en">alphabet</span>
	<span class="ml-ko">의</span>
	<span class="ml-ko">서로</span>
	<span class="ml-ko">다른</span>
	<span class="ml-en">height</span>, <span class="ml-en">weight</span>,
	<span class="ml-en">rhythm</span>
	<span class="ml-ko">을</span>
	<span class="ml-ko">조율해</span>
	<span class="ml-ko">하나의</span>
	<span class="ml-en">sentence</span>
	<span class="ml-ko">안에서</span>
	<span class="ml-ko">자연스러운</span>
	<span class="ml-en">balance</span>
	<span class="ml-ko">와</span>
	<span class="ml-en">flow</span>
	<span class="ml-ko">를</span>
	<span class="ml-ko">만드는</span>
	<span class="ml-en">typography</span>
	<span class="ml-ko">방식이다</span>.
</p>
```

## 기본 문자셋

| 이름    | 클래스      | 범위                                |
| ------- | ----------- | ----------------------------------- |
| `en`    | `.ml-en`    | `[A-Za-z]+`                         |
| `ko`    | `.ml-ko`    | `[ㄱ-ㅎ가-힣ㅏ-ㅣ]+`                |
| `jp`    | `.ml-jp`    | 히라가나/가타카나                   |
| `cn`    | `.ml-cn`    | CJK 한자 범위. 단, `lang="ja"` 문맥에서는 기본적으로 `.ml-jp` 처리 |
| `ar`    | `.ml-ar`    | 아랍 문자 범위                      |
| `num`   | `.ml-num`   | `[0-9]+`                            |
| `punct` | `.ml-punct` | 괄호, 마침표, 쉼표 등 주요 문장부호 |

## 커스텀 문자셋

규칙은 배열 앞쪽부터 먼저 매칭됩니다. 괄호처럼 `punct`와 겹치는 문자를 따로 다루려면 커스텀 규칙을 `punct`보다 앞에 두세요.

```js
MultiLingual.run("body", [
	"en",
	{
		className: "ml-parentheses",
		charset: "()",
	},
	"punct",
]);
```

정규식을 직접 지정할 수도 있습니다.

```js
MultiLingual.run("body", [
	{
		className: "ml-uppercase",
		regex: "[A-Z]+",
	},
]);
```

## 옵션

```js
new MultiLingual({
	containers: "body",
	configuration: ["ko", "en"],
	prefix: "ml-",
	skipSelector:
		"script, style, textarea, input, select, option, code, pre, [data-ml-ignore]",
	processedAttribute: "data-ml-processed",
	contextualJapaneseHan: true,
});
```

`data-ml-ignore`를 붙인 영역은 처리하지 않습니다.

```html
<pre data-ml-ignore>const license = "CCL";</pre>
```

## 되돌리기

```js
var ml = MultiLingual.run("body");
ml.unwrap();
```

## 원본과 달라진 점

- jQuery가 필요 없습니다.
- 설정을 생략하면 `punct`를 제외한 `PRESETS` 문자셋을 자동으로 처리합니다.
- `document.querySelectorAll`, DOM Element, NodeList, HTMLCollection 모두 컨테이너로 받을 수 있습니다.
- `script`, `style`, `pre`, `code`, 폼 입력 요소, `[data-ml-ignore]` 내부는 기본적으로 건너뜁니다.
- 처리된 span에는 `data-ml-processed`가 붙어 중복 wrapping을 방지합니다.
