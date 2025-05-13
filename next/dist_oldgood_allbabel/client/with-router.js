"use strict";

exports.__esModule = true;
exports.default = withRouter;
var _react = _interopRequireDefault(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function withRouter(ComposedComponent) {
  class WithRouteWrapper extends _react.default.Component {
    constructor(...args) {
      super(...args);
      this.context = void 0;
    }
    render() {
      return /*#__PURE__*/_react.default.createElement(ComposedComponent, _extends({
        router: this.context.router
      }, this.props));
    }
  }
  WithRouteWrapper.displayName = void 0;
  WithRouteWrapper.getInitialProps = void 0;
  WithRouteWrapper.contextTypes = {
    router: _propTypes.default.object
  };
  WithRouteWrapper.getInitialProps = ComposedComponent.getInitialProps
  // This is needed to allow checking for custom getInitialProps in _app
  ;
  WithRouteWrapper.origGetInitialProps = ComposedComponent.origGetInitialProps;
  if (process.env.NODE_ENV !== 'production') {
    const name = ComposedComponent.displayName || ComposedComponent.name || 'Unknown';
    WithRouteWrapper.displayName = `withRouter(${name})`;
  }
  return WithRouteWrapper;
}