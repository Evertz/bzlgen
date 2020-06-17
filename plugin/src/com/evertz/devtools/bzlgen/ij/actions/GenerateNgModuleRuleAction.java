package com.evertz.devtools.bzlgen.ij.actions;

import com.evertz.devtools.bzlgen.ij.BzlgenUtil;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.vfs.VfsUtil;
import com.intellij.openapi.vfs.VirtualFile;

import java.util.Arrays;

public class GenerateNgModuleRuleAction extends AbstractBzlgenAction {

  @Override
  public void update(AnActionEvent event) {
    VirtualFile vf = event.getData(CommonDataKeys.VIRTUAL_FILE);

    // ng_module is only supported on directories
    if (!vf.isDirectory()) {
      event.getPresentation().setEnabledAndVisible(false);
      return;
    }

    // look for a .module.ts, and .component.ts, although this is a convention, it's well followed within ev
    // and this somewhat enforces it ;)
    boolean containsNgFiles = Arrays.stream(VfsUtil.getChildren(vf))
        .filter(child -> !child.isDirectory()
            && (child.getPath().endsWith(".component.ts") || child.getPath().endsWith(".module.ts")))
        .count() == 2;

    if (!containsNgFiles) {
      event.getPresentation().setEnabledAndVisible(false);
      return;
    }

    setEnabledForRule(event.getPresentation(), vf);
  }

  @Override
  protected String getRuleType() {
    return BzlgenUtil.isInEv() ? "ng_bundle" : "ng_module";
  }
}
