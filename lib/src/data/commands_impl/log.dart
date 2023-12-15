import 'package:logging/logging.dart';

import '../../application/commands/log.dart';

final LogReader<Logger> log =
    (type, message) => (logger) => () => switch (type) {
          LogType.debug => logger.fine(message),
          LogType.error => logger.severe(message),
          LogType.info => logger.info(message)
        };
