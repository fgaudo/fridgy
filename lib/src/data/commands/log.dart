import 'package:functionally/reader_io.dart';
import 'package:logging/logging.dart';

import '../../application/commands/log.dart';

final Log<Logger> log = (
  info: (message) => ReaderIO(
        (logger) => () => logger.info(message),
      ),
  debug: (message) => ReaderIO(
        (logger) => () => logger.fine(message),
      ),
  error: (message) => ReaderIO(
        (logger) => () => logger.severe(message),
      )
);
