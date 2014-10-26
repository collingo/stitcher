'use strict';
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
chai.use(sinonChai);
var Q = require('q');
var jsdom = require('jsdom').jsdom;
var jquery = require('fs').readFileSync('node_modules/jquery/dist/jquery.js', 'utf-8');
var doc = jsdom('<html><head><script>'+jquery+'</script></head><body></body></html>');
var $ = doc.createWindow().jQuery;
var proxyquire = require('proxyquire');

var sandbox;

//// SUT
var stitcher = require('../src/stitcher');

// helpers
var getHtml = function(dom) {
	return $('<div>').append($(dom).clone()).html();
};

describe('stitcher', function() {

	describe('when called without parameters', function() {

		it('should throw an error with message', function() {
			expect(function() {
				stitcher();
			}).to.throw(Error, /Missing model, template and dom/);
		});

	});

	describe('when missing tpl parameter', function() {

		it('should throw an error with message', function() {
			expect(function() {
				stitcher({});
			}).to.throw(Error, /Missing template and dom/);
		});

	});

	describe('when missing dom parameter', function() {

		it('should throw an error with message', function() {
			expect(function() {
				stitcher({}, '');
			}).to.throw(Error, /Missing dom/);
		});

	});

	describe('when dom does not match the template', function() {

		it('should throw an error highlighting the mismatching elements', function() {
			expect(function() {
				stitcher({}, '<div>{{test}}</div>', $('<p>{{test}}</p>')[0]);
			}).to.throw(Error, /Node does not match template, got <p> expecting <div>/);
			expect(function() {
				stitcher({}, '<span>{{test}}</span>', $('<a>{{test}}</a>')[0]);
			}).to.throw(Error, /Node does not match template, got <a> expecting <span>/);
		});

	});

	describe('when template contains an item to bind', function() {

		var stitched;
		var mod;
		var tpl;
		var dom;
		var mocks;
		var templateToArraySpy;
		var modelOnSpy;
		var templateToArrayResponse = [{
			type: 'div'
		}, {
			type: '>',
			bind: 'test'
		}];

		beforeEach(function() {
			mod = {
				test: 'BindMe'
			};
			tpl = '<div>{{test}}</div>';
			dom = $('<div>BindMe</div>')[0];

			mocks = {
				templateToArray: function() {
					return templateToArrayResponse;
				},
				observe: function() {}
			};
			templateToArraySpy = sinon.spy(mocks, 'templateToArray');
			observeSpy = sinon.spy(mocks, 'observe');
			stitcher = proxyquire('../src/stitcher', {
				'./templateToArray': mocks.templateToArray,
				'./observe': mocks.observe
			});
			stitched = stitcher(mod, tpl, dom);
		});

		it('should return the original dom', function() {
			expect(stitched).to.equal(dom);
		});

		it('should return the original dom with unchanged html', function() {
			expect(getHtml(stitched)).to.equal('<div>BindMe</div>');
		});

		it('should call the templateToArray dependency once', function() {
			expect(templateToArraySpy.callCount).to.equal(1);
		});

		it('should call the templateToArray dependency with template', function() {
			expect(templateToArraySpy.getCall(0).args[0]).to.equal(tpl);
		});

		describe('when the model change event is bound', function() {

			it('should call observe dependency the correct number of times', function() {
				expect(observeSpy.callCount).to.equal(1);
			});

			it('should call observe dependency with model', function() {
				expect(observeSpy.getCall(0).args[0]).to.equal(mod);
			});

			it('should call observe dependency with a callback function', function() {
				var callback = observeSpy.getCall(0).args[1];
				expect(typeof callback).to.equal('function');
			});

			describe('the callback', function() {

				var callback;

				beforeEach(function() {
					mod.test = "Eggs";
					callback = observeSpy.getCall(0).args[1]([{
						object: mod,
						type: 'update',
						name: 'test',
						oldValue: 'BindMe'
					}]);
				});

				it('should alter the dom correctly', function() {
					expect(getHtml(stitched)).to.equal('<div>Eggs</div>');
				});

			});

		});

	});

	describe('when template contains multiple items to bind', function() {

		var stitched;
		var mod;
		var tpl;
		var dom;
		var mocks;
		var templateToArraySpy;
		var modelOnSpy;
		var templateToArrayResponse = [{
			type: 'div'
		}, {
			type: 'div'
		}, {
			type: '>',
			bind: 'test'
		}, {
			type: 'div'
		}, {
			type: '>',
			bind: 'another'
		}];

		beforeEach(function() {
			mod = {
				test: 'BindMe',
				another: 'Me too'
			};
			tpl = '<div><div>{{test}}</div><div>{{another}}</div></div>';
			dom = $('<div><div>BindMe</div><div>Me too</div></div>')[0];

			mocks = {
				templateToArray: function() {
					return templateToArrayResponse;
				},
				observe: function() {}
			};
			templateToArraySpy = sinon.spy(mocks, 'templateToArray');
			observeSpy = sinon.spy(mocks, 'observe');
			stitcher = proxyquire('../src/stitcher', {
				'./templateToArray': mocks.templateToArray,
				'./observe': mocks.observe
			});
			stitched = stitcher(mod, tpl, dom);
		});

		describe('when the model change event is bound', function() {

			it('should call observe dependency the correct number of times', function() {
				expect(observeSpy.callCount).to.equal(1);
			});

		});

	});

	describe('when template contains placeholders in attributes', function() {

		var stitched;
		var mod;
		var tpl;
		var dom;
		var mocks;
		var templateToArraySpy;
		var modelOnSpy;
		var templateToArrayResponse = [{
			type: 'div',
			attributes: {
				show: "{{count}}"
			}
		}, {
			type: '>',
			bind: 'test'
		}];

		beforeEach(function() {
			mod = {
				test: 'BindMe',
				count: 5
			};
			tpl = '<div show="{{count}}">{{test}}</div>';
			dom = $('<div show="true">BindMe</div>')[0];

			mocks = {
				templateToArray: function() {
					return templateToArrayResponse;
				},
				observe: function() {}
			};
			templateToArraySpy = sinon.spy(mocks, 'templateToArray');
			observeSpy = sinon.spy(mocks, 'observe');
			stitcher = proxyquire('../src/stitcher', {
				'./templateToArray': mocks.templateToArray,
				'./observe': mocks.observe
			});
			stitched = stitcher(mod, tpl, dom);
		});

		it('should return the original dom with unchanged html', function() {
			expect(getHtml(stitched)).to.equal('<div show="true">BindMe</div>');
		});

		describe('when the model change event is bound', function() {

			describe('the callback', function() {

				var callback;

				it('should alter the dom correctly when no change to expression', function() {
					mod.count = 3;
					callback = observeSpy.getCall(0).args[1]([{
						object: mod,
						type: 'update',
						name: 'count',
						oldValue: 5
					}]);
					expect(getHtml(stitched)).to.equal('<div show="true">BindMe</div>');
				});

				it('should alter the dom correctly', function() {
					mod.count = 0;
					callback = observeSpy.getCall(0).args[1]([{
						object: mod,
						type: 'update',
						name: 'count',
						oldValue: 5
					}]);
					expect(getHtml(stitched)).to.equal('<div show="false">BindMe</div>');
				});

			});

		});

	});

});
