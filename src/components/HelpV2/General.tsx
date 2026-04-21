import { c as _c } from "react-compiler-runtime";
import { Box, Text } from '../../ink.js';
import { t } from '../../utils/i18n.js';
import { PromptInputHelpMenu } from '../PromptInput/PromptInputHelpMenu.js';
export function General() {
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Box><Text>{t('help.description')}</Text></Box>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <Box flexDirection="column" paddingY={1} gap={1}>{t0}<Box flexDirection="column"><Box><Text bold={true}>{t('help.shortcuts')}</Text></Box><PromptInputHelpMenu gap={2} fixedWidth={true} /></Box></Box>;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
