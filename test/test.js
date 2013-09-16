
function htmlEqual(a, b) {
	a = a.toLowerCase().replace(/[\r\n]/g,'');
	b = b.toLowerCase().replace(/[\r\n]/g,'');
	// IE replace things like `class="f"` with `class=f`, so let's just
	// do it, by default, in the comparee string
	a = a.replace(/="([^"]+)"/g, '=$1');
	b = b.replace(/="([^"]+)"/g, '=$1');
	return equal(a, b); // IE caps <TAGs>s
}

test('Element boundery types', function() {

	var tests = {
		'TEST': '<x>TEST</x>',
		'T<em>EST</em>': '<x>T</x><em><x>EST</x></em>',
		'<div>TEST</div>': '<div><x>TEST</x></div>',
		'<i>T</i><b>E</b><u>S</u><i>T</i>': '<i><x>T</x></i><b><x>E</x></b><u><x>S</x></u><i><x>T</x></i>',
		'<i>T</i><u>EST ok</u>': '<i><x>T</x></i><u><x>EST</x> ok</u>',
		'<i>ok T</i><em>EST</em>': '<i>ok <x>T</x></i><em><x>EST</x></em>',
		'<i>ok <i><b>T</b></i></i><em>EST</em>': '<i>ok <i><b><x>T</x></b></i></i><em><x>EST</x></em>'
	};

	var d = document.createElement('div');

	for (var t in tests) {
		d.innerHTML = t;
		findAndReplaceDOMText(/TEST/, d, 'x');
		htmlEqual(d.innerHTML, tests[t]);
		d.innerHTML = t;
		findAndReplaceDOMText(/TEST/g, d, 'x');
		htmlEqual(d.innerHTML, tests[t]);
		findAndReplaceDOMText.revert();
		htmlEqual(d.innerHTML, t);
	}

});

test('Match lengths', function() {
	var d = document.createElement('div');
	for (var i = 0; i < 100; ++i) {
		d.innerHTML = Array(i + 1).join('<em>x</em>');
		findAndReplaceDOMText(/x+/, d, 'z');
		htmlEqual(d.innerHTML, Array(i + 1).join('<em><z>x</z></em>'))
	}
});

test('StencilNode definition', function() {
	var d = document.createElement('div');
	d.innerHTML = 'test test';
	findAndReplaceDOMText(/test/ig, d, 'div');
	htmlEqual(d.innerHTML, '<div>test</div> <div>test</div>');
	d.innerHTML = 'test test';
	findAndReplaceDOMText(/test/ig, d, function(fill) {
		var e = document.createElement('x');
		e.className = 'f';
		e.appendChild(document.createTextNode(fill));
		return e;
	});
	htmlEqual(d.innerHTML, '<x class="f">test</x> <x class="f">test</x>');
	d.innerHTML = 'test test';
	findAndReplaceDOMText(/test/ig, d, document.createElement('z'));
	htmlEqual(d.innerHTML, '<z>test</z> <z>test</z>');
});

test('Edge case text nodes', function() {
	var d = document.createElement('div');
	// Empty text nodes
	var t1 = d.appendChild(document.createTextNode(''));
	d.appendChild(document.createTextNode('x'));
	var t2 = d.appendChild(document.createTextNode(''));
	findAndReplaceDOMText(/x/, d, 'em');
	htmlEqual(d.innerHTML, '<em>x</em>');
	equal(d.childNodes.length, 3);
	equal(d.childNodes[0], t1);
	equal(d.childNodes[2], t2);
});

test('Custom replacement function', function() {
	var d = document.createElement('div');
	d.innerHTML = 'aaaaa';
	findAndReplaceDOMText(/a/g, d, function(fill) {
		return document.createTextNode('b' + fill);
	});
	htmlEqual(d.innerHTML, 'bababababa');
	d.innerHTML = '1234';
	findAndReplaceDOMText(/\d/g, d, function(fill) {
		var e = document.createElement('u');
		e.innerHTML = fill + '_';
		return e;
	});
	htmlEqual(d.innerHTML, '<u>1_</u><u>2_</u><u>3_</u><u>4_</u>');
});

test('Custom replacement function - correct ordering', function() {
	var d = document.createElement('div');
	var nCalled = 0;
	d.innerHTML = 'test<b>ing</b>123';
	findAndReplaceDOMText(/testing[0-9]+/g, d, function(fill) {
		switch (nCalled++) {
			case 0: equal(fill, 'test'); break;
			case 1: equal(fill, 'ing'); break;
			case 2: equal(fill, '123'); break;
			default: ok(false, 'Not expecting further matches');
		}
		return document.createTextNode(fill);
	});
	equal(nCalled, 3);
});

test('Capture groups', function() {

	var text = 'TEST TESThello TESThello TESThello';
	var d = document.createElement('div');

	d.innerHTML = text;
	findAndReplaceDOMText(/(TEST)hello/, d, 'x', 1);
	htmlEqual(d.innerHTML, 'TEST <x>TEST</x>hello TESThello TESTHello');

	d.innerHTML = text;
	findAndReplaceDOMText(/(TEST)hello/g, d, 'x', 1);
	htmlEqual(d.innerHTML, 'TEST <x>TEST</x>hello <x>TEST</x>hello <x>TEST</x>hello');

	d.innerHTML = text;
	findAndReplaceDOMText(/\s(TEST)(hello)/g, d, 'x', 2);
	htmlEqual(d.innerHTML, 'TEST TEST<x>hello</x> TEST<x>hello</x> TEST<x>hello</x>');
});

test('Word boundaries', function() {

	var text = 'a go matching at test wordat at';
	var d = document.createElement('div');

	d.innerHTML = text;
	findAndReplaceDOMText(/\bat\b/, d, 'x');
	htmlEqual(d.innerHTML, 'a go matching <x>at</x> test wordat at');

	d.innerHTML = text;
	findAndReplaceDOMText(/\bat\b/g, d, 'x');
	htmlEqual(d.innerHTML, 'a go matching <x>at</x> test wordat <x>at</x>');
});

test('Element filtering', function() {

	var html = 'foo <style>foo{}</style> foo <script>foo;</script>';
	var d = document.createElement('div');

	d.innerHTML = html;

	findAndReplaceDOMText(/foo/g, d, 'span', null, function(el) {
		return !/^(?:script|style)$/i.test(el.nodeName);
	});
	htmlEqual(d.innerHTML, '<span>foo</span> <style>foo{}</style> <span>foo</span> <script>foo;</script>');

	d.innerHTML = html;

	findAndReplaceDOMText(/foo/g, d, 'span', null, function(el) {
		return 'script' !== el.nodeName.toLowerCase();
	});
	// (Only script tag blocked:)
	htmlEqual(d.innerHTML, '<span>foo</span> <style><span>foo</span>{}</style> <span>foo</span> <script>foo;</script>');

});

test('Replace text with new text', function() {

  var html, d, search, replace;

  html = 'foo <em>fo</em>o <strong>foo</strong>hello foobar';
  d = document.createElement('div');
  d.innerHTML = html;
  search = 'foo';
  replace = 'bar';
  findAndReplaceDOMText(new RegExp(search, 'g'), d, findAndReplaceDOMText.replaceTextHandler(replace));
  htmlEqual(d.innerHTML, 'bar <em>ba</em>r <strong>bar</strong>hello barbar');

  html = 'Я люблю ко<em>ш</em>ек. кошек мило.';
  d = document.createElement('div');
  d.innerHTML = html;
  search = 'кошек';
  replace = 'собак';
  findAndReplaceDOMText(new RegExp(search, 'g'), d, findAndReplaceDOMText.replaceTextHandler(replace));
  htmlEqual(d.innerHTML, 'Я люблю со<em>б</em>ак. собак мило.');
});