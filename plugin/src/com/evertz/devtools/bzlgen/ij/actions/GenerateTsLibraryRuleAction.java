package com.evertz.devtools.bzlgen.ij.actions;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class GenerateTsLibraryRuleAction extends AbstractBzlgenAction {
  private static final Set<String> SUPPORTED_EXTS = new HashSet<String>(Collections.singleton("ts"));

  @Override
  protected Set<String> getSupportedFileExtensions() {
    return SUPPORTED_EXTS;
  }

  @Override
  protected String getRuleType() {
    return "ts_library";
  }
}
