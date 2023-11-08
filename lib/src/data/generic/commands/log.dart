import 'package:logging/logging.dart';

import '../../../application/commands/log.dart';

final Log<Logger> log = (type, message) => (logger) =>
    () => type == LogType.error ? logger.severe(message) : logger.info(message);
