import * as fs from "fs";

export class FileStreamWriter {
  static write(outFile: string, writeFile: (stream: fs.WriteStream) => void){
    return new Promise<boolean>((res, rej) => {
      const stream = fs.createWriteStream(outFile);
      stream.once('open', () => {
        try{
          writeFile(stream)
          stream.end()
          res(true);
        } catch(e){
          stream.end()
          res(false);
        }
      });
    })
  }
}
