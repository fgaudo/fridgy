import 'package:fgaudo_functional/reader_io.dart';

typedef DeleteFoodsByIds<ENV> = ReaderIO<ENV, void> Function(Set<String> ids);
