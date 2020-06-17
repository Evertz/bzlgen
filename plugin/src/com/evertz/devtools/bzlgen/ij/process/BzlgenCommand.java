package com.evertz.devtools.bzlgen.ij.process;

import com.evertz.devtools.bzlgen.ij.BzlgenUtil;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.util.EnvironmentUtil;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

public final class BzlgenCommand {
  final ProcessBuilder processBuilder;
  final ExecutorService executor;

  protected BzlgenCommand(ProcessBuilder processBuilder, ExecutorService executor) {
    this.processBuilder = processBuilder;
    this.executor = executor;
  }

  public Future<Integer> run() {
    if (executor.isShutdown() || executor.isTerminated()) {
      return CompletableFuture.completedFuture(1);
    }

    return executor.submit(() -> {
      try {
        Process process = processBuilder.start();

        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        StringBuilder builder = new StringBuilder();
        String line = null;

        while ((line = reader.readLine()) != null) {
          builder.append(line);
          builder.append(System.getProperty("line.separator"));
        }

        String result = builder.toString();

        int code = process.waitFor();

        NotificationType type = code == 0 ? NotificationType.INFORMATION : NotificationType.ERROR;
        String message = code == 0 ? "Generated BUILD file" : "Error generating BUILD file";

        Notifications.Bus.notify(new Notification("bzlgen", BzlgenUtil.MESSAGE_TITLE, message, type));

        if (code != 0) {
          Notifications.Bus.notify(new Notification("bzlgen", BzlgenUtil.MESSAGE_TITLE, result, type));
        }
      } catch (IOException e) {
        e.printStackTrace();
      }

      return 1;
    });
  }

  public static class Builder {
    private String type;
    private String path;
    private Map<String, String> flags = new HashMap<>();

    private String workingDirectory;

    private ExecutorService executor;

    public Builder type(String type) {
      this.type = type;
      return this;
    }

    public Builder path(String path) {
      this.path = path;
      return this;
    }

    public Builder workingDirectory(String workingDirectory) {
      this.workingDirectory = workingDirectory;
      return this;
    }

    public Builder executor(ExecutorService executor) {
      this.executor = executor;
      return this;
    }

    public Builder flag(String flag, String value) {
      this.flags.put("--" + flag, value);
      return this;
    }

    public BzlgenCommand build() {
      File binary = BzlgenUtil.findBzlgenBinaryOnPath();
      if (binary == null) {
        throw new RuntimeException("bzlgen not found on PATH");
      }

      ArrayList<String> commands = new ArrayList<>();
      commands.add(binary.getAbsolutePath());
      commands.add(type);
      commands.add(path);
      flags.forEach((flag, value) -> commands.add(flag + "=" + value));

      ProcessBuilder processBuilder = new ProcessBuilder(commands)
          .directory(new File(workingDirectory))
          .redirectErrorStream(true);

      processBuilder.environment()
          .putAll(EnvironmentUtil.getEnvironmentMap());

      return new BzlgenCommand(processBuilder, executor);
    }
  }
}
