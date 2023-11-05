import 'package:fgaudo_functional/io.dart';
import 'package:uuid/uuid.dart';

typedef DeleteFoodsByIds = IO<void> Function(Set<Uuid> ids);
