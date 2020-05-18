package com.evertz.devtools.bzlgen.ij.actions;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class GenerateNodeJsBinaryRuleAction extends AbstractBzlgenAction {
  private static final Set<String> SUPPORTED_EXTS = new HashSet<String>(Arrays.asList("ts", "js"));

  @Override
  protected boolean supportsDirectories() {
    return false;
  }

  @Override
  protected Set<String> getSupportedFileExtensions() {
    return SUPPORTED_EXTS;
  }

  @Override
  protected String getRuleType() {
    return "js_binary";
  }
}
