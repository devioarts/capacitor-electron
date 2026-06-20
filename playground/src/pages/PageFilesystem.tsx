import React, { useState } from "react";
import { Filesystem } from "@capacitor/filesystem";
import { Button } from "../components/Button.tsx";
import { Input, TextArea, Label } from "../components/Input.tsx";
import { useLogger } from "../components/logger-context";
import { DIRECTORIES } from "../helpers/filesystem.ts";

export const PageFilesystem: React.FC = () => {
  const log = useLogger();

  const [dir, setDir]         = useState("DATA");
  const [path, setPath]       = useState("cap-electron-test/hello.txt");
  const [content, setContent] = useState("Hello from Electron!");
  const [encoding, setEncoding] = useState("utf8");

  const [fromPath, setFromPath]  = useState("cap-electron-test/hello.txt");
  const [toPath, setToPath]      = useState("cap-electron-test/hello2.txt");

  const [dirPath, setDirPath] = useState("cap-electron-test");

  const dirOpts = dir || undefined;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Shared parameters</p>
        <div className="flex flex-wrap gap-2">
          <Label label="Directory">
            <select
              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
              value={dir}
              onChange={(e) => setDir(e.target.value)}
            >
              {DIRECTORIES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Label>
          <Label label="Path">
            <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="relative path" />
          </Label>
          <Label label="Encoding">
            <select
              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
              value={encoding}
              onChange={(e) => setEncoding(e.target.value)}
            >
              <option value="utf8">utf8</option>
              <option value="ascii">ascii</option>
              <option value="">base64</option>
            </select>
          </Label>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">writeFile() / appendFile()</p>
        <Label label="Content">
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="file content"
          />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const result = await Filesystem.writeFile({
                path,
                directory: dirOpts as never,
                data: content,
                encoding: encoding as never,
                recursive: true,
              });
              log.info("Filesystem", "writeFile", result);
            } catch (e) { log.error("Filesystem", "writeFile", e); }
          }}>
            writeFile()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              await Filesystem.appendFile({
                path,
                directory: dirOpts as never,
                data: content,
                encoding: encoding as never,
              });
              log.info("Filesystem", "appendFile", "done");
            } catch (e) { log.error("Filesystem", "appendFile", e); }
          }}>
            appendFile()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">readFile() / stat() / getUri()</p>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              const result = await Filesystem.readFile({
                path,
                directory: dirOpts as never,
                encoding: encoding as never,
              });
              log.info("Filesystem", "readFile", result);
            } catch (e) { log.error("Filesystem", "readFile", e); }
          }}>
            readFile()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await Filesystem.stat({ path, directory: dirOpts as never });
              log.info("Filesystem", "stat", result);
            } catch (e) { log.error("Filesystem", "stat", e); }
          }}>
            stat()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await Filesystem.getUri({ path, directory: dirOpts as never });
              log.info("Filesystem", "getUri", result);
            } catch (e) { log.error("Filesystem", "getUri", e); }
          }}>
            getUri()
          </Button>

          <Button type="red" onClick={async () => {
            try {
              await Filesystem.deleteFile({ path, directory: dirOpts as never });
              log.info("Filesystem", "deleteFile", "done");
            } catch (e) { log.error("Filesystem", "deleteFile", e); }
          }}>
            deleteFile()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Directories (mkdir / rmdir / readdir)</p>
        <Label label="Directory path">
          <Input value={dirPath} onChange={(e) => setDirPath(e.target.value)} />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button type="primary" onClick={async () => {
            try {
              await Filesystem.mkdir({ path: dirPath, directory: dirOpts as never, recursive: true });
              log.info("Filesystem", "mkdir", "done");
            } catch (e) { log.error("Filesystem", "mkdir", e); }
          }}>
            mkdir()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await Filesystem.readdir({ path: dirPath, directory: dirOpts as never });
              log.info("Filesystem", "readdir", result);
            } catch (e) { log.error("Filesystem", "readdir", e); }
          }}>
            readdir()
          </Button>

          <Button type="red" onClick={async () => {
            try {
              await Filesystem.rmdir({ path: dirPath, directory: dirOpts as never, recursive: true });
              log.info("Filesystem", "rmdir", "done");
            } catch (e) { log.error("Filesystem", "rmdir", e); }
          }}>
            rmdir()
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">rename() / copy()</p>
        <div className="flex flex-wrap gap-2">
          <Label label="From">
            <Input value={fromPath} onChange={(e) => setFromPath(e.target.value)} />
          </Label>
          <Label label="To">
            <Input value={toPath} onChange={(e) => setToPath(e.target.value)} />
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="yellow" onClick={async () => {
            try {
              await Filesystem.rename({
                from: fromPath,
                to: toPath,
                directory: dirOpts as never,
              });
              log.info("Filesystem", "rename", "done");
            } catch (e) { log.error("Filesystem", "rename", e); }
          }}>
            rename()
          </Button>

          <Button type="neutral" onClick={async () => {
            try {
              const result = await Filesystem.copy({
                from: fromPath,
                to: toPath,
                directory: dirOpts as never,
              });
              log.info("Filesystem", "copy", result);
            } catch (e) { log.error("Filesystem", "copy", e); }
          }}>
            copy()
          </Button>
        </div>
      </section>
    </div>
  );
};
