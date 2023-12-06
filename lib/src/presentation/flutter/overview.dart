import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:functionally/extensions/option/match.dart';

import '../../application/flow/overview.dart';
import '../../core/controller_builder.dart';

final class OverviewView extends StatefulWidget {
  const OverviewView({
    required this.createController,
    super.key,
  });

  static const String routeName = '/overview';

  final OverviewControllerIO createController;

  @override
  State<StatefulWidget> createState() => _OverviewViewState();
}

final class _OverviewViewState extends State<OverviewView> {
  late final ScrollController _scrollController;
  bool _extended = true;

  @override
  void initState() {
    super.initState();

    _scrollController = ScrollController();

    _scrollController.addListener(_scrollListener);
  }

  void _scrollListener() {
    final maxScrollReached = _scrollController.position.maxScrollExtent ==
        _scrollController.position.pixels;
    final scrollUp = _scrollController.position.userScrollDirection ==
        ScrollDirection.forward;

    setState(() => _extended = maxScrollReached || scrollUp);
  }

  @override
  void dispose() {
    super.dispose();
    _scrollController.dispose();
  }

  @override
  Widget build(BuildContext context) => ControllerBuilder(
        key: widget.key,
        createController: widget.createController,
        builder: (_, modelOption, __) => modelOption.match(
          onNone: const ColoredBox(color: Colors.black),
          onSome: (data) => Scaffold(
            appBar: AppBar(
              automaticallyImplyLeading: false,
              title: const Text('Bottom App Bar Demo'),
            ),
            body: ListView(
              padding: const EdgeInsets.only(bottom: 70),
              controller: _scrollController,
              children: const <Widget>[
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
                Material(
                  child: ListTile(
                    title: Text('Cheese'),
                    subtitle: Text('Two days left'),
                    leading: Icon(Icons.ac_unit),
                  ),
                ),
              ],
            ),
            floatingActionButton: FloatingActionButton.extended(
              onPressed: () {},
              extendedIconLabelSpacing: _extended ? 10 : 0,
              extendedPadding:
                  _extended ? null : const EdgeInsets.symmetric(horizontal: 16),
              icon: const Icon(Icons.add),
              label: AnimatedOpacity(
                opacity: _extended ? 1 : 0,
                duration: Durations.long1,
                curve: Curves.fastEaseInToSlowEaseOut,
                child: AnimatedSize(
                  duration: Durations.medium3,
                  curve: Curves.fastEaseInToSlowEaseOut,
                  child: _extended ? const Text('Add Food') : Container(),
                ),
              ),
            ),
            bottomNavigationBar: BottomAppBar(
              child: Row(
                children: <Widget>[
                  PopupMenuButton<String>(
                    itemBuilder: (BuildContext context) =>
                        <PopupMenuEntry<String>>[
                      const PopupMenuItem<String>(
                        value: '1',
                        child: Text('Item 1'),
                      ),
                      const PopupMenuItem<String>(
                        value: '2',
                        child: Text('Item 2'),
                      ),
                      const PopupMenuItem<String>(
                        value: '3',
                        child: Text('Item 3'),
                      ),
                    ],
                  ),
                  IconButton(
                    tooltip: 'Search',
                    icon: const Icon(Icons.search),
                    onPressed: () {},
                  ),
                  IconButton(
                    tooltip: 'Favorite',
                    icon: const Icon(Icons.favorite),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ),
        ),
      );
}
