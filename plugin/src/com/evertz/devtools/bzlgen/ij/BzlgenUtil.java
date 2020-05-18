package com.evertz.devtools.bzlgen.ij;

import com.intellij.openapi.fileTypes.FileType;
import com.intellij.openapi.fileTypes.FileTypes;
import com.intellij.openapi.vfs.VfsUtil;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.search.FileTypeIndex;
import com.intellij.util.EnvironmentUtil;
import com.intellij.util.indexing.FileBasedIndex;

import java.io.File;
import java.util.Set;

public final class BzlgenUtil {
  private BzlgenUtil() {}

  public static final String BZLGEN_BINARY = "bzlgen";

  public static final String MESSAGE_TITLE = "bzlgen";

  public static File findBzlgenBinaryOnPath() {
    String path = EnvironmentUtil.getValue("PATH");

    if (path == null) {
      return null;
    }

    for (String entry : path.split(File.pathSeparator)) {
      File file = new File(entry, BZLGEN_BINARY);
      if (file.exists() && file.isFile() && file.canExecute()) {
        return file;
      }
    }

    return null;
  }

  public static boolean directoryContainsFileWithExtension(VirtualFile directory, String type) {
    if (!directory.isDirectory()) {
      return false;
    }

    for (VirtualFile child : VfsUtil.getChildren(directory)) {
      if (type.equals(child.getExtension())) {
        return true;
      }
    }

    return false;
  }

  public static boolean directoryContainsFileWithAnyExtension(VirtualFile directory, Set<String> types) {
    if (!directory.isDirectory()) {
      return false;
    }

    if (types.isEmpty()) {
      // empty set is considered that all files are supported
      return true;
    }

    for (String type : types) {
      if (directoryContainsFileWithExtension(directory, type)) {
        return true;
      }
    }

    return false;
  }

  public static boolean isInEv() {
    // pathetic check to try and see if we are inside ev, or somewhere else
    return EnvironmentUtil.getEnvironmentMap().containsKey("build_tools_dir");
  }
}
