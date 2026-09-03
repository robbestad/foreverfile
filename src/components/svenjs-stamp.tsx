import { create, version } from "svenjs";

export const SvenjsStamp = create({
  render() {
    return (
      <a
        className="svenjs-credit"
        href="https://svenjs.xyz/"
        rel="noopener noreferrer"
      >
        <img
          className="svenjs-mark"
          src="/svenjs-mark.svg"
          width="36"
          height="36"
          alt=""
        />
        <span className="svenjs-credit-copy">
          <span className="svenjs-credit-kicker">UI built with</span>
          <span className="svenjs-credit-name">SvenJS {version}</span>
        </span>
      </a>
    );
  },
});
