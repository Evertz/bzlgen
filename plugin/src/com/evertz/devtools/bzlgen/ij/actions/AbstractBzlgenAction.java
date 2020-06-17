package com.evertz.devtools.bzlgen.ij.actions;

import com.evertz.devtools.bzlgen.ij.BzlgenUtil;
import com.evertz.devtools.bzlgen.ij.process.BzlgenCommand;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.actionSystem.Presentation;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.roots.ProjectFileIndex;
import com.intellij.openapi.vfs.VfsUtilCore;
import com.intellij.openapi.vfs.VirtualFile;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public abstract class AbstractBzlgenAction extends AnAction {
  private final static ExecutorService executor = Executors.newSingleThreadExecutor();

  @Override
  public void update(AnActionEvent event) {
    VirtualFile vf = event.getData(CommonDataKeys.VIRTUAL_FILE);

    if (vf.isDirectory() && !supportsDirectories()) {
      event.getPresentation().setEnabledAndVisible(false);

      // no point carrying on
      return;
    }

    String extension = vf.getExtension();
    Set<String> supportedExtensions = getSupportedFileExtensions();

    boolean containsSupportedFiles = BzlgenUtil.directoryContainsFileWithAnyExtension(vf, supportedExtensions);

    if (containsSupportedFiles || supportedExtensions.contains(extension)) {
      setEnabledForRule(event.getPresentation(), vf);
    } else {
      event.getPresentation().setEnabledAndVisible(false);
    }
  }

  @Override
  public void actionPerformed(AnActionEvent event) {
    VirtualFile selected = event.getData(CommonDataKeys.VIRTUAL_FILE);
    VirtualFile contentRoot = getContentRoot(event.getProject(), selected);

    BzlgenCommand.Builder builder = new BzlgenCommand.Builder()
        .type(getRuleType())
        .path(VfsUtilCore.getRelativePath(selected, contentRoot))
        .workingDirectory(contentRoot.getPath())
        .executor(executor);

    decorateBzlgenCommandBuilder(builder);

    builder.build().run();

    if (selected.isDirectory()) {
      selected.refresh(false, false);
    } else {
      selected.getParent().refresh(false, false);
    }
  }

  protected void setEnabledForRule(Presentation presentation, VirtualFile vf) {
    String type = getRuleType();
    presentation.setText("Generate " + type + " for " + vf.getName(), false);
    presentation.setEnabledAndVisible(true);
  }

  protected boolean supportsDirectories() {
    return true;
  }

  protected Set<String> getSupportedFileExtensions() {
    return Collections.emptySet();
  }

  protected VirtualFile getContentRoot(Project project, VirtualFile file) {
    ProjectFileIndex index = ProjectFileIndex.getInstance(project);
    return index.getContentRootForFile(file);
  }

  protected void decorateBzlgenCommandBuilder(BzlgenCommand.Builder builder) {
    // allow subclass to override this and add to the builder
  };

  protected abstract String getRuleType();
}
